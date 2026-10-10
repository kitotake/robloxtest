export type LeaderboardId = "Victories" | "Support" | "PlayTime";

/** How a raw value is shown to the player. */
export type LeaderboardValueFormat = "Count" | "Robux" | "Duration";

/** One row of a board. Contains no user id: only what the player is meant to see. */
export interface LeaderboardEntry {
	rank: number;
	name: string;
	/** Raw value (count, Robux or seconds); formatted by the client. */
	value: number;
	isSelf: boolean;
}

/** Answer to a leaderboard request, built entirely by the server. */
export interface LeaderboardBoard {
	id: LeaderboardId;
	entries: LeaderboardEntry[];
	/** The requesting player's own live value. */
	ownValue: number;
	/** The requesting player's rank when they are in the list, otherwise 0. */
	ownRank: number;
	/** When the global ranking was last refreshed (os.time), 0 if it never was. */
	updatedAt: number;
}
