import { Players } from "@rbxts/services";
import { createLogger } from "shared/util/Logger";
import { Signal } from "shared/util/Signal";

const log = createLogger("RewardService");

/**
 * A real rewarded-ad integration (a Roblox-supported system) implements this.
 * It shows the video however its platform requires, verifies the completion
 * server-side, then reports it through the reporter returned by registerProvider.
 */
export interface RewardedAdProvider {
	readonly name: string;
	/** Starts a rewarded video for the player. Returns false if it could not start. */
	requestRewardedVideo(player: Player): boolean;
}

/**
 * Abstraction between the checkpoint system and whatever rewarded-ad provider
 * is connected. NO provider is registered in this project: until one is, the
 * video route is unavailable and nothing is ever granted. There is no timer,
 * no button and no remote that can report a completion.
 */
export class RewardService {
	/** Fired only for a verified completion reported by the registered provider. */
	readonly videoCompleted = new Signal<[player: Player]>();

	private provider: RewardedAdProvider | undefined;
	private readonly pending = new Set<Player>();

	constructor() {
		Players.PlayerRemoving.Connect((player) => this.pending.delete(player));
	}

	isAvailable(): boolean {
		return this.provider !== undefined;
	}

	/**
	 * Connects a provider. Returns the only function able to report a verified
	 * completion; it is ignored unless that provider is the registered one and a
	 * video was actually requested for that player.
	 */
	registerProvider(provider: RewardedAdProvider): (player: Player) => void {
		this.provider = provider;
		log.debug(`Rewarded-ad provider registered: ${provider.name}`);
		return (player) => {
			if (this.provider !== provider || player.Parent !== Players || !this.pending.has(player)) return;
			this.pending.delete(player);
			this.videoCompleted.fire(player);
		};
	}

	/** Returns true if the provider started a video for the player. */
	requestVideo(player: Player): boolean {
		if (this.provider === undefined || this.pending.has(player)) return false;
		const started = this.provider.requestRewardedVideo(player);
		if (started) this.pending.add(player);
		return started;
	}

	/** Called by the provider integration if a video is abandoned or fails. */
	cancel(player: Player): void {
		this.pending.delete(player);
	}
}
