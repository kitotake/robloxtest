import { ProgressChangeReason } from "shared/types/ProgressionTypes";

/**
 * NO-SKIP is earned only by a run that was walked to the end ("Auto") and whose
 * eligibility was never lost (no paid skip, no checkpoint recovery, no backward move).
 */
export function isNoSkipEarned(eligible: boolean, reason: ProgressChangeReason): boolean {
	return eligible && reason === "Auto";
}
