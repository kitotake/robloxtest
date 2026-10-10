/** What the server tells a player about the run they just completed (display only). */
export interface CompletionResult {
	/** The run was finished with a paid skip. */
	viaSkip: boolean;
	/** The player's Victory total after this completion. */
	totalVictories: number;
	/** This completion earned the NO-SKIP achievement. */
	noSkipEarned: boolean;
	/** NO-SKIP was earned for the very first time. */
	noSkipFirstTime: boolean;
	/** Ids of the titles unlocked by this completion. */
	newTitles: string[];
}
