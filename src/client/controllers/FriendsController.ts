import { Players } from "@rbxts/services";
import { Signal } from "shared/util/Signal";

/**
 * Caches which players in the server are friends of the local player.
 * Friendship is queried once per player (never in a loop) and dropped when
 * the player leaves.
 */
export class FriendsController {
	/** (userId, isFriend) */
	readonly changed = new Signal<[userId: number, isFriend: boolean]>();
	private readonly cache = new Map<number, boolean>();
	private readonly localPlayer = Players.LocalPlayer;

	start(): void {
		Players.PlayerAdded.Connect((player) => this.check(player));
		Players.PlayerRemoving.Connect((player) => {
			this.cache.delete(player.UserId);
			this.changed.fire(player.UserId, false);
		});
		for (const player of Players.GetPlayers()) this.check(player);
	}

	isFriend(userId: number): boolean {
		return this.cache.get(userId) === true;
	}

	private check(player: Player): void {
		if (player === this.localPlayer || this.cache.has(player.UserId)) return;
		this.cache.set(player.UserId, false); // prevents duplicate queries while pending

		task.spawn(() => {
			const [ok, isFriend] = pcall(() => this.localPlayer.IsFriendsWithAsync(player.UserId as unknown as User));
			if (ok && isFriend === true && player.Parent === Players) {
				this.cache.set(player.UserId, true);
				this.changed.fire(player.UserId, true);
			}
		});
	}
}
