import { RunService } from "@rbxts/services";
import { GameConfig } from "shared/config/GameConfig";

export function createLogger(tag: string) {
	// Debug output is a development tool: it prints only inside Roblox Studio (and only while
	// GameConfig.DEBUG is on), so live servers stay quiet. Warnings are always shown.
	const inStudio = RunService.IsStudio();
	return {
		debug: (...args: unknown[]): void => {
			if (inStudio && GameConfig.DEBUG) print(`[${tag}]`, ...args);
		},
		warn: (...args: unknown[]): void => {
			warn(`[${tag}]`, ...args);
		},
	};
}
