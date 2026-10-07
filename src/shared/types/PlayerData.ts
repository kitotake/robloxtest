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
	/** Seconds. Written by a later phase. */
	totalPlayTime: number;
	/** Written by a later phase. */
	unlockedTitles: string[];
	/** Most recent PurchaseIds already granted (receipt idempotency). */
	processedReceipts: string[];
}

export interface SessionLock {
	jobId: string;
	time: number;
}

export type StoredPlayerData = PlayerData & { lock?: SessionLock };
