import { getRemoteEvent, RemoteNames } from "shared/remotes";

/** Sends short feedback messages to a single player's screen. */
export class NoticeService {
	private readonly notice = getRemoteEvent(RemoteNames.Notice);

	send(player: Player, kind: "info" | "error", text: string): void {
		this.notice.FireClient(player, kind, text);
	}
}
