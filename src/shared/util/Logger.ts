import { GameConfig } from "shared/config/GameConfig";

export function createLogger(tag: string) {
	return {
		debug: (...args: unknown[]): void => {
			if (GameConfig.DEBUG) print(`[${tag}]`, ...args);
		},
		warn: (...args: unknown[]): void => {
			warn(`[${tag}]`, ...args);
		},
	};
}
