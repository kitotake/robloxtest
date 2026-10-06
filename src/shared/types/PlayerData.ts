export const DATA_VERSION = 1;

/** Everything persisted for a player. Written by the server only. */
export interface PlayerData {
	version: number;
	/** Current validated position on the 0 → MAX_STEP path. */
	step: number;
	/** NO-SKIP state of the run in progress (a run can span several sessions). */
	noSkipEligible: boolean;
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
