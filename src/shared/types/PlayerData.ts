export const DATA_VERSION = 2;

/**
 * Everything persisted for a player. Written by the server only.
 *
 * The live position on the path (currentStep) and the No-Skip state of the run
 * in progress are deliberately NOT here: they belong to the session and start
 * from 0 every time the player joins.
 */
export interface PlayerData {
	version: number;
	/** Persistent checkpoint step (1..MAX_STEP-1). 0 = no checkpoint. Never the live step. */
	savedCheckpoint: number;
	/** Rewarded videos watched toward the next checkpoint. */
	rewardedVideosWatched: number;
	/** Checkpoints already earned through rewarded videos (selects the next requirement). */
	rewardedCheckpointsClaimed: number;
	/** Earned/bought "save" rights not yet turned into a checkpoint. */
	saveCredits: number;
	/** Bought "recovery" rights not yet used. */
	recoveryCredits: number;
	victories: number;
	donationRobux: number;
	skipRobux: number;
	/** Always donationRobux + skipRobux. */
	supportRobuxTotal: number;
	rubies: number;
	/** Seconds spent in the game, credited by PlayTimeService every time the data is saved. */
	totalPlayTime: number;
	/** Last value written to each global leaderboard, so unchanged values are never rewritten. */
	publishedVictories: number;
	publishedSupport: number;
	publishedPlayTime: number;
	/** Ids of the titles the player owns (permanent, see TitleConfig). */
	unlockedTitles: string[];
	/** Id of the title shown above the player's head. */
	equippedTitle: string;
	/** Most recent PurchaseIds already granted (receipt idempotency). */
	processedReceipts: string[];
}

export interface SessionLock {
	jobId: string;
	time: number;
}

export type StoredPlayerData = PlayerData & { lock?: SessionLock };
