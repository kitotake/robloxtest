import { LeaderboardValueFormat } from "shared/types/LeaderboardTypes";

/** 1250 -> "1,250" */
export function formatCount(value: number): string {
	const digits = tostring(math.floor(math.abs(value)));
	const length = digits.size();
	let result = value < 0 ? "-" : "";
	for (let index = 0; index < length; index++) {
		if (index > 0 && (length - index) % 3 === 0) result += ",";
		result += digits.sub(index + 1, index + 1);
	}
	return result;
}

/** 152280 seconds -> "42h 18m"; 3000 -> "50m". Hours are never rolled into days. */
export function formatDuration(seconds: number): string {
	const total = math.max(0, math.floor(seconds));
	const hours = math.floor(total / 3600);
	const minutes = math.floor((total % 3600) / 60);
	if (hours > 0) return `${formatCount(hours)}h ${minutes < 10 ? "0" : ""}${minutes}m`;
	return `${minutes}m`;
}

export function formatLeaderboardValue(format: LeaderboardValueFormat, value: number): string {
	if (format === "Robux") return `${formatCount(value)} R$`;
	if (format === "Duration") return formatDuration(value);
	return formatCount(value);
}
