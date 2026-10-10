import { LeaderboardId, LeaderboardValueFormat } from "shared/types/LeaderboardTypes";

export interface LeaderboardBoardConfig {
	readonly id: LeaderboardId;
	readonly title: string;
	readonly icon: string;
	readonly format: LeaderboardValueFormat;
}

export const LeaderboardConfig = {
	/** OrderedDataStore names (one per category). */
	STORES: {
		Victories: "WaitUntil100_Victories",
		Support: "WaitUntil100_Support",
		PlayTime: "WaitUntil100_PlayTime",
	} as const,

	/** Tabs shown by the UI, in order. */
	BOARDS: [
		{ id: "Victories", title: "Victories", icon: "🏆", format: "Count" },
		{ id: "Support", title: "Support", icon: "💎", format: "Robux" },
		{ id: "PlayTime", title: "Play Time", icon: "⏱️", format: "Duration" },
	] as readonly LeaderboardBoardConfig[],

	/** Rows kept and shown per board. */
	TOP_COUNT: 25,

	/** How often the server re-reads the global top lists (3 reads per refresh). */
	GLOBAL_REFRESH_INTERVAL_SECONDS: 120,
	/** How often the server looks for values that changed and need publishing. */
	PUBLISH_CHECK_INTERVAL_SECONDS: 60,
	/** A play-time value is only republished once it grew by this much... */
	PLAYTIME_MIN_PUBLISH_DELTA_SECONDS: 600,
	/** ...or by this much when the player leaves (final publish). */
	PLAYTIME_MIN_PUBLISH_DELTA_ON_LEAVE_SECONDS: 60,

	/** Minimum delay between two leaderboard requests from the same player (server). */
	REQUEST_COOLDOWN_SECONDS: 2,
	/** The UI reuses a board it fetched less than this long ago (client). */
	CLIENT_CACHE_SECONDS: 15,
	SHUTDOWN_MAX_WAIT_SECONDS: 20,

	VICTORY_RULES: {
		/**
		 * true: reaching 100 by buying a skip still completes the run and counts as a victory
		 * (it never counts as a No-Skip completion, which is a separate, later system).
		 * false: only a run finished by walking counts.
		 */
		COUNT_COMPLETION_REACHED_BY_SKIP: true,
	},
};
