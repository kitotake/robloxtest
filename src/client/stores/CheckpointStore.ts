import { getRemoteEvent, getRemoteFunction, RemoteNames } from "shared/remotes";
import { CheckpointInfo } from "shared/types/CheckpointTypes";
import { Signal } from "shared/util/Signal";

const EMPTY: CheckpointInfo = {
	saved: 0,
	videosWatched: 0,
	videosRequired: 0,
	videosAvailable: false,
	saveCredits: 0,
	recoveryCredits: 0,
};

/** Read-only client mirror of the saved checkpoint state (display only). */
export class CheckpointStore {
	readonly changed = new Signal<[info: CheckpointInfo]>();
	private info: CheckpointInfo = EMPTY;
	private received = false;

	start(): void {
		getRemoteEvent(RemoteNames.CheckpointChanged).OnClientEvent.Connect((info: CheckpointInfo) => this.set(info));

		task.spawn(() => {
			const info = getRemoteFunction(RemoteNames.GetCheckpointInfo).InvokeServer() as CheckpointInfo | undefined;
			if (!this.received && info !== undefined) this.set(info);
		});
	}

	get(): CheckpointInfo {
		return this.info;
	}

	private set(info: CheckpointInfo): void {
		this.received = true;
		this.info = info;
		this.changed.fire(info);
	}
}
