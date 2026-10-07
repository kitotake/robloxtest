import { Players } from "@rbxts/services";
import { CheckpointConfig } from "shared/config/CheckpointConfig";
import { GameConfig } from "shared/config/GameConfig";
import { MonetizationConfig } from "shared/config/MonetizationConfig";
import { getRemoteEvent, getRemoteFunction, RemoteNames } from "shared/remotes";
import { CheckpointInfo } from "shared/types/CheckpointTypes";
import { createLogger } from "shared/util/Logger";
import { Signal } from "shared/util/Signal";
import { DataService } from "./DataService";
import { NoticeService } from "./NoticeService";
import { ProgressionService } from "./ProgressionService";
import { PurchasePromptService } from "./PurchasePromptService";
import { PurchaseService } from "./PurchaseService";
import { RewardService } from "./RewardService";
import { RubyService } from "./RubyService";

const log = createLogger("CheckpointService");
const MAX_SAVABLE_STEP = GameConfig.MAX_STEP - 1;

/**
 * Persistent checkpoint, kept strictly apart from the live session step.
 *
 * - Saving: a "save credit" (earned from the configured number of verified
 *   rewarded videos, or bought with Robux) is turned into a checkpoint at the
 *   player's current validated step. A credit that cannot be used yet is kept.
 * - Recovery: moves the player forward to the saved checkpoint (never
 *   backward), paying a recovery credit (bought with Robux) or Rubies.
 * The client only requests an action; every check and payment happens here.
 */
export class CheckpointService {
	/** (player, step) — hook for the future save visual. */
	readonly checkpointSaved = new Signal<[player: Player, step: number]>();
	readonly recovered = new Signal<[player: Player, step: number]>();

	private readonly infoChanged = getRemoteEvent(RemoteNames.CheckpointChanged);
	private readonly infoRequest = getRemoteFunction(RemoteNames.GetCheckpointInfo);
	private readonly actionRemote = getRemoteEvent(RemoteNames.CheckpointAction);
	private readonly lastRequest = new Map<Player, number>();

	constructor(
		private readonly data: DataService,
		private readonly progression: ProgressionService,
		private readonly rubies: RubyService,
		private readonly rewards: RewardService,
		private readonly purchases: PurchaseService,
		private readonly prompts: PurchasePromptService,
		private readonly notices: NoticeService,
	) {}

	start(): void {
		this.infoRequest.OnServerInvoke = (player) => this.getInfo(player);
		this.data.loaded.connect((player) => this.publish(player));
		this.actionRemote.OnServerEvent.Connect((player, action: unknown) => this.onAction(player, action));
		this.rewards.videoCompleted.connect((player) => this.onVideoCompleted(player));
		Players.PlayerRemoving.Connect((player) => this.lastRequest.delete(player));

		this.purchases.registerProduct(CheckpointConfig.SAVE_PRODUCT.productId, "CHECKPOINT_SAVE", (player) =>
			this.grantSaveCredit(player),
		);
		if (CheckpointConfig.RECOVERY.ALLOW_ROBUX) {
			this.purchases.registerProduct(
				CheckpointConfig.RECOVERY.ROBUX_PRODUCT.productId,
				"CHECKPOINT_RECOVERY",
				(player) => this.grantRecoveryCredit(player),
			);
		}
		if (CheckpointConfig.RECOVERY.ALLOW_RUBIES && CheckpointConfig.RECOVERY.RUBY_COST <= 0) {
			log.warn("Recovery with Rubies is FREE until CheckpointConfig.RECOVERY.RUBY_COST is set");
		}
	}

	getInfo(player: Player): CheckpointInfo | undefined {
		const saved = this.data.getData(player);
		if (saved === undefined) return undefined;
		return {
			saved: saved.savedCheckpoint,
			videosWatched: saved.rewardedVideosWatched,
			videosRequired: this.getRequiredVideos(saved.rewardedCheckpointsClaimed),
			videosAvailable: this.rewards.isAvailable(),
			saveCredits: saved.saveCredits,
			recoveryCredits: saved.recoveryCredits,
		};
	}

	/** Videos needed for the next rewarded checkpoint; 0 when the video route is disabled. */
	private getRequiredVideos(claimed: number): number {
		const requirements = CheckpointConfig.REWARDED_CHECKPOINT_REQUIREMENTS;
		if (requirements.size() === 0) return 0;
		return math.max(1, requirements[math.min(claimed, requirements.size() - 1)]);
	}

	// ---------------------------------------------------------------- requests

	private onAction(player: Player, action: unknown): void {
		if (!typeIs(action, "string")) return;

		const now = os.clock();
		const last = this.lastRequest.get(player);
		if (last !== undefined && now - last < MonetizationConfig.REQUEST_COOLDOWN_SECONDS) return;
		this.lastRequest.set(player, now);

		if (action === "WatchVideo") this.requestVideo(player);
		else if (action === "BuySave") this.requestSavePurchase(player);
		else if (action === "Save") this.requestSave(player);
		else if (action === "Recover") this.requestRecovery(player);
		else if (action === "BuyRecovery") this.requestRecoveryPurchase(player);
	}

	private requestVideo(player: Player): void {
		const saved = this.data.getData(player);
		if (saved === undefined) return this.fail(player, "Your data is still loading. Try again in a moment.");
		if (!this.rewards.isAvailable()) return this.fail(player, "Rewarded videos aren't available yet.");
		const blocked = this.getSaveBlockReason(player);
		if (blocked !== undefined && saved.saveCredits <= 0) return this.fail(player, blocked);
		if (!this.rewards.requestVideo(player)) this.fail(player, "The video couldn't start. Try again later.");
	}

	private requestSavePurchase(player: Player): void {
		const blocked = this.getSaveBlockReason(player);
		if (blocked !== undefined) return this.fail(player, blocked);
		this.prompts.promptProduct(player, CheckpointConfig.SAVE_PRODUCT.productId, "Checkpoint save");
	}

	private requestSave(player: Player): void {
		const saved = this.data.getData(player);
		if (saved === undefined) return this.fail(player, "Your data is still loading. Try again in a moment.");
		if (saved.saveCredits <= 0) return this.fail(player, "You have no save credit.");
		const blocked = this.getSaveBlockReason(player);
		if (blocked !== undefined) return this.fail(player, blocked);
		this.redeemSaveCredit(player);
	}

	private requestRecovery(player: Player): void {
		const saved = this.data.getData(player);
		if (saved === undefined) return this.fail(player, "Your data is still loading. Try again in a moment.");
		const blocked = this.getRecoveryBlockReason(player);
		if (blocked !== undefined) return this.fail(player, blocked);

		if (saved.recoveryCredits > 0) {
			this.redeemRecoveryCredit(player);
			return;
		}
		if (!CheckpointConfig.RECOVERY.ALLOW_RUBIES) {
			return this.fail(player, "Recover your checkpoint with Robux instead.");
		}
		const cost = CheckpointConfig.RECOVERY.RUBY_COST;
		if (cost > 0 && !this.rubies.hasEnough(player, cost)) {
			return this.fail(player, `Not enough Rubies (you need ${cost}).`);
		}
		if (cost > 0) this.rubies.remove(player, cost);
		if (!this.performRecovery(player) && cost > 0) this.rubies.add(player, cost); // refund, nothing moved
	}

	private requestRecoveryPurchase(player: Player): void {
		if (!CheckpointConfig.RECOVERY.ALLOW_ROBUX) return this.fail(player, "Recovery with Robux is disabled.");
		const blocked = this.getRecoveryBlockReason(player);
		if (blocked !== undefined) return this.fail(player, blocked);
		this.prompts.promptProduct(player, CheckpointConfig.RECOVERY.ROBUX_PRODUCT.productId, "Checkpoint recovery");
	}

	// ----------------------------------------------------------------- granting

	/** Only reachable through RewardService, i.e. a verified completion from the registered provider. */
	private onVideoCompleted(player: Player): void {
		const saved = this.data.getData(player);
		if (saved === undefined) return;

		saved.rewardedVideosWatched += 1;
		const required = this.getRequiredVideos(saved.rewardedCheckpointsClaimed);
		if (required > 0 && saved.rewardedVideosWatched >= required) {
			saved.rewardedVideosWatched = 0;
			saved.rewardedCheckpointsClaimed += 1;
			saved.saveCredits += 1;
			this.tryRedeemSaveCredit(player);
		}
		this.publish(player);
	}

	/** ProcessReceipt handler for the Robux save product. */
	private grantSaveCredit(player: Player): boolean {
		const saved = this.data.getData(player);
		if (saved === undefined) return false;
		saved.saveCredits += 1;
		this.tryRedeemSaveCredit(player);
		this.publish(player);
		return true;
	}

	/** ProcessReceipt handler for the Robux recovery product. */
	private grantRecoveryCredit(player: Player): boolean {
		const saved = this.data.getData(player);
		if (saved === undefined) return false;
		saved.recoveryCredits += 1;
		if (this.getRecoveryBlockReason(player) === undefined) this.redeemRecoveryCredit(player);
		this.publish(player);
		return true;
	}

	private tryRedeemSaveCredit(player: Player): void {
		if (this.getSaveBlockReason(player) === undefined) this.redeemSaveCredit(player);
		else this.notices.send(player, "info", "Save credit earned. Use it from the checkpoint menu.");
	}

	private redeemSaveCredit(player: Player): void {
		const saved = this.data.getData(player);
		const state = this.progression.getState(player);
		if (saved === undefined || state === undefined || saved.saveCredits <= 0) return;

		saved.saveCredits -= 1;
		saved.savedCheckpoint = math.min(state.step, MAX_SAVABLE_STEP);
		log.debug(`${player.Name} saved a checkpoint at ${saved.savedCheckpoint}`);
		this.checkpointSaved.fire(player, saved.savedCheckpoint);
		this.notices.send(player, "info", `Checkpoint saved at step ${saved.savedCheckpoint}!`);
		this.publish(player);
		task.spawn(() => this.data.saveNow(player));
	}

	private redeemRecoveryCredit(player: Player): void {
		const saved = this.data.getData(player);
		if (saved === undefined || saved.recoveryCredits <= 0) return;
		saved.recoveryCredits -= 1;
		if (!this.performRecovery(player)) saved.recoveryCredits += 1;
	}

	/**
	 * Moves the player forward to the saved checkpoint. The caller has already
	 * validated and paid. NO-SKIP is invalidated first (configurable rule); the
	 * move goes through ProgressionService, whose "Checkpoint" change makes
	 * AutoMovementService physically place the character on the checkpoint tile.
	 */
	private performRecovery(player: Player): boolean {
		const saved = this.data.getData(player);
		if (saved === undefined || saved.savedCheckpoint <= 0) return false;
		const target = saved.savedCheckpoint;

		if (GameConfig.NO_SKIP_RULES.InvalidateOnCheckpointRecovery) {
			this.progression.invalidateNoSkip(player, "checkpoint recovery");
		}
		if (!this.progression.setProgress(player, target, "Checkpoint")) return false;

		if (CheckpointConfig.CONSUME_CHECKPOINT_ON_RECOVERY) saved.savedCheckpoint = 0;
		this.recovered.fire(player, target);
		this.notices.send(player, "info", `Recovered your checkpoint at step ${target}!`);
		this.publish(player);
		task.spawn(() => this.data.saveNow(player));
		return true;
	}

	// ---------------------------------------------------------------- validation

	private getSaveBlockReason(player: Player): string | undefined {
		const state = this.progression.getState(player);
		const saved = this.data.getData(player);
		if (state === undefined || saved === undefined) return "Your data is still loading. Try again in a moment.";
		if (state.completed) return "You already reached the end!";
		if (state.step < CheckpointConfig.MIN_CHECKPOINT_STEP)
			return "Move a little further before saving a checkpoint.";
		if (math.min(state.step, MAX_SAVABLE_STEP) <= saved.savedCheckpoint) {
			return "You already have a checkpoint at or beyond this point.";
		}
		return undefined;
	}

	private getRecoveryBlockReason(player: Player): string | undefined {
		const state = this.progression.getState(player);
		const saved = this.data.getData(player);
		if (state === undefined || saved === undefined) return "Your data is still loading. Try again in a moment.";
		if (state.completed) return "You already reached the end!";
		if (saved.savedCheckpoint <= 0) return "You have no saved checkpoint.";
		if (state.step >= saved.savedCheckpoint) return "You're already at or past your checkpoint.";
		return undefined;
	}

	private fail(player: Player, text: string): void {
		this.notices.send(player, "error", text);
	}

	private publish(player: Player): void {
		const info = this.getInfo(player);
		if (info !== undefined) this.infoChanged.FireClient(player, info);
	}
}
