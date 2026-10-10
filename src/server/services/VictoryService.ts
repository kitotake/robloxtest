import { LeaderboardConfig } from "shared/config/LeaderboardConfig";
import { shouldCountVictory } from "shared/util/LeaderboardUtil";
import { createLogger } from "shared/util/Logger";
import { Signal } from "shared/util/Signal";
import { DataService } from "./DataService";
import { ProgressionService } from "./ProgressionService";

const log = createLogger("VictoryService");

/**
 * Counts victories. A victory is recorded when ProgressionService announces
 * that a run reached the last step (once per run), never for a reconnection,
 * a checkpoint recovery or an administrative completion.
 */
export class VictoryService {
	/** (player, totalVictories) */
	readonly victoryRecorded = new Signal<[player: Player, total: number]>();

	/** Players already credited for the run they are currently on. */
	private readonly recorded = new Set<Player>();

	constructor(
		private readonly progression: ProgressionService,
		private readonly data: DataService,
	) {}

	start(): void {
		this.progression.runCompleted.connect((player, reason) => this.onRunCompleted(player, reason));
		// A new run (reset) can be won again.
		this.progression.changed.connect((player, _newStep, _oldStep, reason) => {
			if (reason === "Reset") this.recorded.delete(player);
		});
		this.data.released.connect((player) => this.recorded.delete(player));
	}

	private onRunCompleted(player: Player, reason: Parameters<typeof shouldCountVictory>[0]): void {
		const saved = this.data.getData(player);
		if (saved === undefined || this.recorded.has(player)) return;
		if (!shouldCountVictory(reason, LeaderboardConfig.VICTORY_RULES.COUNT_COMPLETION_REACHED_BY_SKIP)) {
			log.debug(`${player.Name} completed a run by ${reason}: not counted as a victory`);
			return;
		}

		this.recorded.add(player);
		saved.victories += 1;
		log.debug(`${player.Name} victory #${saved.victories} (${reason})`);
		this.victoryRecorded.fire(player, saved.victories);
		// Rare and valuable: write it now instead of waiting for the next autosave.
		task.spawn(() => this.data.saveNow(player));
	}
}
