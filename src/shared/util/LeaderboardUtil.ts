import { ProgressChangeReason } from "shared/types/ProgressionTypes";

export interface RankingEntry {
	userId: number;
	name: string;
	value: number;
}

/**
 * Global top list overlaid with the live values of the players in this server,
 * so a change shows up immediately here while the global store lags behind.
 * Live values win (they are the authoritative, newest ones); zero values are dropped.
 */
export function mergeRanking(
	globalEntries: readonly RankingEntry[],
	liveEntries: readonly RankingEntry[],
	topCount: number,
): RankingEntry[] {
	const merged = new Map<number, RankingEntry>();
	for (const entry of globalEntries) merged.set(entry.userId, entry);
	for (const entry of liveEntries) {
		if (entry.value > 0) merged.set(entry.userId, entry);
	}

	const list: RankingEntry[] = [];
	for (const [, entry] of merged) {
		if (entry.value > 0) list.push(entry);
	}
	// roblox-ts comparator: true when `a` must come before `b` (highest value first, then name).
	list.sort((a, b) => {
		if (a.value !== b.value) return a.value > b.value;
		return a.name < b.name;
	});

	const top: RankingEntry[] = [];
	for (let index = 0; index < math.min(topCount, list.size()); index++) top.push(list[index]);
	return top;
}

/** A value is published only if it is positive and grew enough since the last publish. */
export function shouldPublish(value: number, published: number, minDelta: number): boolean {
	return value > 0 && value - published >= minDelta;
}

/**
 * A completion counts as a victory only when the player really walked or skipped to 100.
 * Checkpoint recovery, resets and admin completions never count.
 */
export function shouldCountVictory(reason: ProgressChangeReason, countCompletionBySkip: boolean): boolean {
	if (reason === "Auto") return true;
	if (reason === "Skip") return countCompletionBySkip;
	return false;
}
