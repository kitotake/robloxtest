/** Marker for a Roblox Badge ID that has not been created yet. */
export const PLACEHOLDER_BADGE_ID = 0;

/**
 * NO-SKIP: finishing the 0 -> 100 run with no paid skip and no checkpoint recovery.
 * It is an achievement of its own, completely separate from the Victory counter.
 */
export const NoSkipConfig = {
	/** Title (see TitleConfig, requirement "Special") granted with the achievement. */
	TITLE_ID: "NO_SKIP",
	/** PLACEHOLDER: create the badge in the Creator Hub and put its ID here. 0 = no badge is awarded. */
	BADGE_ID: PLACEHOLDER_BADGE_ID,
};
