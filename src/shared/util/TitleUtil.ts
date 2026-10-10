import { TITLES, TitleDefinition, TitleRequirement } from "shared/config/TitleConfig";
import { formatCount, formatDuration } from "./FormatUtil";

export interface TitleStats {
	victories: number;
	support: number;
	playTime: number;
}

export function getTitle(id: string): TitleDefinition | undefined {
	return TITLES.find((title) => title.id === id);
}

export function meetsRequirement(requirement: TitleRequirement, stats: TitleStats): boolean {
	if (requirement.type === "None") return true;
	if (requirement.type === "Victories") return stats.victories >= requirement.count;
	if (requirement.type === "Support") return stats.support >= requirement.robux;
	if (requirement.type === "PlayTime") return stats.playTime >= requirement.seconds;
	return false; // "Special" titles are granted by code only
}

/** The most prestigious title among the given ids (unknown ids are ignored). */
export function pickBestTitle(ids: readonly string[]): string | undefined {
	let best: TitleDefinition | undefined;
	for (const id of ids) {
		const title = getTitle(id);
		if (title !== undefined && (best === undefined || title.priority > best.priority)) best = title;
	}
	return best?.id;
}

/** Player-facing text explaining how to unlock a title. */
export function describeRequirement(title: TitleDefinition): string {
	const requirement = title.requirement;
	if (requirement.type === "None") return "Everyone starts here";
	if (requirement.type === "Victories") {
		return requirement.count === 1
			? "Reach 100 for the first time"
			: `Reach 100 ${formatCount(requirement.count)} times`;
	}
	if (requirement.type === "Support") return `Support the game with ${formatCount(requirement.robux)} R$`;
	if (requirement.type === "PlayTime") return `Play for ${formatDuration(requirement.seconds)}`;
	return title.hint ?? "Special title";
}
