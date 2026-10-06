import { Players } from "@rbxts/services";
import { getRemoteEvent, getRemoteFunction, RemoteNames } from "shared/remotes";
import { ProgressEntry } from "shared/types/ProgressionTypes";
import { Signal } from "shared/util/Signal";

/** Read-only client mirror of the server's progression (display only). */
export class ProgressStore {
	/** (userId, step) */
	readonly changed = new Signal<[userId: number, step: number]>();
	private readonly steps = new Map<number, number>();

	start(): void {
		const progressChanged = getRemoteEvent(RemoteNames.ProgressChanged);
		progressChanged.OnClientEvent.Connect((userId: number, step: number) => this.set(userId, step));

		Players.PlayerRemoving.Connect((player) => this.steps.delete(player.UserId));

		task.spawn(() => {
			const snapshot = getRemoteFunction(RemoteNames.GetProgressSnapshot).InvokeServer() as ProgressEntry[];
			for (const entry of snapshot) {
				// Live events are newer than the snapshot: only fill the gaps.
				if (!this.steps.has(entry.userId)) this.set(entry.userId, entry.step);
			}
		});
	}

	get(userId: number): number | undefined {
		return this.steps.get(userId);
	}

	private set(userId: number, step: number): void {
		this.steps.set(userId, step);
		this.changed.fire(userId, step);
	}
}
