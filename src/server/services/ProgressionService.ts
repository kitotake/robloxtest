import { Players } from "@rbxts/services";
import { GameConfig } from "shared/config/GameConfig";
import { getRemoteEvent, getRemoteFunction, RemoteNames } from "shared/remotes";
import { ProgressChangeReason, ProgressEntry, RunState } from "shared/types/ProgressionTypes";
import { createLogger } from "shared/util/Logger";
import { Signal } from "shared/util/Signal";
import { DataService } from "./DataService";

const log = createLogger("ProgressionService");

/**
 * Single source of truth for every player's position on the 0 → MAX_STEP path
 * during the current session. The position (currentStep) and the No-Skip state
 * live only in memory: every session starts at step 0 and nothing here is
 * written to the DataStore. The only persistent position is the saved
 * checkpoint, owned by CheckpointService. Clients only receive copies of these
 * values for display.
 */
export class ProgressionService {
	/** (player, newStep, oldStep, reason) — only for real progression changes. */
	readonly changed = new Signal<[player: Player, newStep: number, oldStep: number, reason: ProgressChangeReason]>();
	/** Fired when a player's session run starts (at step 0, once their data is loaded). */
	readonly sessionStarted = new Signal<[player: Player]>();
	/** Fired once per run when a player reaches MAX_STEP, with the reason of the final step. */
	readonly runCompleted = new Signal<[player: Player, reason: ProgressChangeReason]>();

	private readonly states = new Map<Player, RunState>();
	private readonly progressChanged = getRemoteEvent(RemoteNames.ProgressChanged);
	private readonly snapshotRequest = getRemoteFunction(RemoteNames.GetProgressSnapshot);

	constructor(private readonly data: DataService) {}

	start(): void {
		this.snapshotRequest.OnServerInvoke = () => this.buildSnapshot();
		this.data.loaded.connect((player) => this.startSession(player));
		Players.PlayerRemoving.Connect((player) => this.states.delete(player));
	}

	getState(player: Player): Readonly<RunState> | undefined {
		return this.states.get(player);
	}

	getProgress(player: Player): number {
		return this.states.get(player)?.step ?? 0;
	}

	/** Backward movement is disabled unless the config (or a future effect) allows it. */
	canMoveBackward(_player: Player): boolean {
		return GameConfig.ALLOW_BACKWARD_MOVEMENT;
	}

	/**
	 * The only way to change a step. Physical events (falling, dying, respawning)
	 * never go through here, so they can neither lower the step nor affect the
	 * No-Skip flag. A rejected backward move changes nothing either, while an
	 * accepted one always invalidates No-Skip.
	 * Returns true if the step actually changed.
	 */
	setProgress(player: Player, step: number, reason: ProgressChangeReason): boolean {
		const state = this.states.get(player);
		if (state === undefined) return false;

		const target = math.clamp(math.floor(step), 0, GameConfig.MAX_STEP);
		const old = state.step;
		if (target === old) return false;

		if (target < old) {
			if (!this.canMoveBackward(player)) {
				log.warn(`Rejected backward move for ${player.Name}: ${old} -> ${target} (${reason})`);
				return false;
			}
			state.noSkipEligible = false;
		}

		state.step = target;
		this.replicate(player, target);
		this.changed.fire(player, target, old, reason);
		log.debug(`${player.Name}: ${old} -> ${target} (${reason})`);

		if (target >= GameConfig.MAX_STEP) this.completeRun(player, reason);
		return true;
	}

	/** Moves the player forward (never past MAX_STEP). Returns the resulting step. */
	advancePlayer(player: Player, amount: number, reason: ProgressChangeReason = "Auto"): number {
		if (amount <= 0) return this.getProgress(player);
		this.setProgress(player, this.getProgress(player) + amount, reason);
		return this.getProgress(player);
	}

	/** Permanently ends NO-SKIP eligibility for the current run. */
	invalidateNoSkip(player: Player, why: string): void {
		const state = this.states.get(player);
		if (state === undefined || !state.noSkipEligible) return;
		state.noSkipEligible = false;
		log.debug(`${player.Name} lost NO-SKIP eligibility (${why})`);
	}

	/**
	 * Marks the run as finished (once per run) and announces it through `runCompleted`.
	 * A direct call is an administrative completion, which VictoryService does not count.
	 */
	completeRun(player: Player, reason: ProgressChangeReason = "Admin"): void {
		const state = this.states.get(player);
		if (state === undefined || state.completed) return;
		state.completed = true;
		state.paused = true;
		log.debug(`${player.Name} completed the run (noSkipEligible=${state.noSkipEligible})`);
		this.runCompleted.fire(player, reason);
	}

	/** Starts a fresh run at step 0 with NO-SKIP eligibility restored. */
	resetRun(player: Player): void {
		const state = this.states.get(player);
		if (state === undefined) return;
		const old = state.step;
		state.step = 0;
		state.noSkipEligible = true;
		state.completed = false;
		state.paused = false;
		this.replicate(player, 0);
		this.changed.fire(player, 0, old, "Reset");
	}

	setPaused(player: Player, paused: boolean): void {
		const state = this.states.get(player);
		if (state !== undefined) state.paused = paused;
	}

	/** Every session starts a brand-new run at step 0, whatever happened in earlier sessions. */
	private startSession(player: Player): void {
		if (this.data.getData(player) === undefined || this.states.has(player)) return;

		this.states.set(player, { step: 0, noSkipEligible: true, completed: false, paused: false });
		this.replicate(player, 0);
		log.debug(`Session started for ${player.Name} at step 0`);
		this.sessionStarted.fire(player);
	}

	private replicate(player: Player, step: number): void {
		this.progressChanged.FireAllClients(player.UserId, step);
	}

	private buildSnapshot(): ProgressEntry[] {
		const entries: ProgressEntry[] = [];
		for (const [player, state] of this.states) {
			entries.push({ userId: player.UserId, step: state.step });
		}
		return entries;
	}
}
