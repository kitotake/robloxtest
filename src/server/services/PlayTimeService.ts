import { DataService } from "./DataService";

/**
 * Server-side play time. There is no per-player loop and no timer: a player's
 * elapsed time is added to `totalPlayTime` right before each write of their
 * data (autosave every minute, purchases, leaving), so the stored value is
 * always exact and costs no extra DataStore request.
 */
export class PlayTimeService {
	private readonly lastCredit = new Map<Player, number>();

	constructor(private readonly data: DataService) {}

	start(): void {
		// Counting starts when the player's data is loaded, i.e. when they really are in the game.
		this.data.loaded.connect((player) => this.lastCredit.set(player, os.time()));
		this.data.beforeSave.connect((player) => this.credit(player));
		this.data.released.connect((player) => this.lastCredit.delete(player));
	}

	/** Adds the time elapsed since the last credit to the player's persistent total. */
	credit(player: Player): void {
		const saved = this.data.getData(player);
		const last = this.lastCredit.get(player);
		if (saved === undefined || last === undefined) return;

		const now = os.time();
		if (now <= last) return;
		saved.totalPlayTime += now - last;
		this.lastCredit.set(player, now);
	}

	/** Total seconds played, including the current session up to now. */
	getTotal(player: Player): number {
		this.credit(player);
		return this.data.getData(player)?.totalPlayTime ?? 0;
	}
}
