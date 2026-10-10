import { getRemoteEvent, getRemoteFunction, RemoteNames } from "shared/remotes";
import { TitleInfo } from "shared/types/TitleTypes";
import { Signal } from "shared/util/Signal";

/** Read-only client mirror of the player's titles (display only). */
export class TitleStore {
	readonly changed = new Signal<[info: TitleInfo]>();
	private info: TitleInfo = { unlocked: [], equipped: "" };
	private received = false;

	start(): void {
		getRemoteEvent(RemoteNames.TitlesChanged).OnClientEvent.Connect((info: TitleInfo) => this.set(info));

		task.spawn(() => {
			const info = getRemoteFunction(RemoteNames.GetTitles).InvokeServer() as TitleInfo | undefined;
			if (!this.received && info !== undefined) this.set(info);
		});
	}

	get(): TitleInfo {
		return this.info;
	}

	private set(info: TitleInfo): void {
		this.received = true;
		this.info = info;
		this.changed.fire(info);
	}
}
