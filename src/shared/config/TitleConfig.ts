/** What a player must have to unlock a title. All stats come from the persistent PlayerData. */
export type TitleRequirement =
	| { readonly type: "None" }
	| { readonly type: "Victories"; readonly count: number }
	| { readonly type: "Support"; readonly robux: number }
	| { readonly type: "PlayTime"; readonly seconds: number }
	/** Never unlocked by a stat: granted by code (NO-SKIP today; OG, Speedrunner... later). */
	| { readonly type: "Special" };

export interface TitleDefinition {
	readonly id: string;
	readonly displayName: string;
	/** Shown for "Special" titles (the others get a text generated from their requirement). */
	readonly hint?: string;
	readonly color: Color3;
	/** Higher = more prestigious: decides which title is auto-equipped. */
	readonly priority: number;
	readonly requirement: TitleRequirement;
}

/**
 * Data-driven titles. The thresholds below are PLACEHOLDER balance values, not
 * final design: edit this list freely, nothing else hardcodes a title.
 */
export const TITLES: readonly TitleDefinition[] = [
	{
		id: "NEWCOMER",
		displayName: "Newcomer",
		color: Color3.fromRGB(200, 200, 215),
		priority: 0,
		requirement: { type: "None" },
	},
	{
		id: "WALKER",
		displayName: "Walker",
		color: Color3.fromRGB(120, 205, 130),
		priority: 10,
		requirement: { type: "PlayTime", seconds: 30 * 60 },
	},
	{
		id: "RUNNER",
		displayName: "Runner",
		color: Color3.fromRGB(100, 190, 255),
		priority: 20,
		requirement: { type: "PlayTime", seconds: 3 * 3600 },
	},
	{
		id: "EXPLORER",
		displayName: "Explorer",
		color: Color3.fromRGB(255, 170, 90),
		priority: 30,
		requirement: { type: "PlayTime", seconds: 10 * 3600 },
	},
	{
		id: "SUPPORTER",
		displayName: "Supporter",
		color: Color3.fromRGB(255, 120, 170),
		priority: 35,
		requirement: { type: "Support", robux: 10 },
	},
	{
		id: "CLUB_100",
		displayName: "100 Club",
		color: Color3.fromRGB(255, 200, 40),
		priority: 50,
		requirement: { type: "Victories", count: 1 },
	},
	{
		id: "ELITE",
		displayName: "Elite",
		color: Color3.fromRGB(190, 120, 255),
		priority: 60,
		requirement: { type: "Victories", count: 10 },
	},
	{
		id: "LEGEND",
		displayName: "Legend",
		color: Color3.fromRGB(255, 90, 90),
		priority: 70,
		requirement: { type: "Victories", count: 50 },
	},
	{
		id: "NO_SKIP",
		displayName: "NO-SKIP",
		hint: "Reach 100 without any paid skip or checkpoint recovery",
		color: Color3.fromRGB(0, 240, 255),
		priority: 100,
		requirement: { type: "Special" },
	},
];

export const TitleConfig = {
	/** Equipped when nothing better is. Must be a title with requirement "None". */
	DEFAULT_TITLE_ID: "NEWCOMER",
	/** A newly unlocked title replaces the equipped one if it has a higher priority. */
	AUTO_EQUIP_HIGHER_PRIORITY: true,
	/** Minimum delay between two equip requests from the same player. */
	EQUIP_COOLDOWN_SECONDS: 1,

	NAMEPLATE: {
		ENABLED: true,
		/** Height of the title/name plate above the head, in studs. */
		HEIGHT_OFFSET: 2.8,
		MAX_DISTANCE: 90,
	},
};
