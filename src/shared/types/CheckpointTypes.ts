/** Checkpoint state replicated to the owning client for display only. */
export interface CheckpointInfo {
	/** Saved checkpoint step, 0 when none. */
	saved: number;
	videosWatched: number;
	/** Videos needed for the next rewarded checkpoint (0 = video route disabled). */
	videosRequired: number;
	/** Whether a rewarded-ad provider is connected on the server. */
	videosAvailable: boolean;
	saveCredits: number;
	recoveryCredits: number;
}

export type CheckpointAction = "WatchVideo" | "BuySave" | "Save" | "Recover" | "BuyRecovery";
