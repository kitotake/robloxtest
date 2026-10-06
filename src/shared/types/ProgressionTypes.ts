export type ProgressChangeReason = "Auto" | "Skip" | "Checkpoint" | "Reset" | "Admin";

/** Server-side state of the run a player is currently doing. */
export interface RunState {
	step: number;
	noSkipEligible: boolean;
	completed: boolean;
	/** When true the automatic movement timer does not advance the player. */
	paused: boolean;
}

/** Replicated to clients for UI only; never read back as authority. */
export interface ProgressEntry {
	userId: number;
	step: number;
}
