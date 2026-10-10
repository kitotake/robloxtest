import { Players } from "@rbxts/services";
import { getRemoteEvent, RemoteNames } from "shared/remotes";
import { CompletionResult } from "shared/types/CompletionTypes";
import { ProgressChangeReason } from "shared/types/ProgressionTypes";
import { createLogger } from "shared/util/Logger";
import { NoSkipService } from "./NoSkipService";
import { ProgressionService } from "./ProgressionService";
import { TitleService } from "./TitleService";
import { VictoryService } from "./VictoryService";

const log = createLogger("CompletionService");

/**
 * The single owner of a completed run. It is the only subscriber of
 * `runCompleted` that decides anything: it asks, in a fixed sequence, the
 * Victory, the NO-SKIP achievement (and, through them, the titles) what they
 * granted for THIS completion, then sends one summary to the player's screen.
 *
 * Nothing is accumulated between completions and nothing depends on the order
 * in which `runCompleted` handlers or services were started: every result is
 * either returned by the service that granted it, or read as the difference in
 * the player's unlocked titles before and after the sequence. It still decides
 * nothing itself: the rules stay in VictoryService, NoSkipService and TitleService.
 */
export class CompletionService {
	private readonly runCompletedRemote = getRemoteEvent(RemoteNames.RunCompleted);

	constructor(
		private readonly progression: ProgressionService,
		private readonly victories: VictoryService,
		private readonly noSkip: NoSkipService,
		private readonly titles: TitleService,
	) {}

	start(): void {
		this.progression.runCompleted.connect((player, reason) => this.onRunCompleted(player, reason));
	}

	private onRunCompleted(player: Player, reason: ProgressChangeReason): void {
		const titlesBefore = this.getUnlockedTitles(player);

		// Explicit sequence. The titles unlocked by the Victory (milestones) and by NO-SKIP (special)
		// are unlocked synchronously inside these two calls (Signal.fire starts handlers immediately).
		const totalVictories = this.victories.recordCompletion(player, reason);
		const noSkip = this.noSkip.evaluateCompletion(player, reason);

		// No Victory was counted (admin completion, checkpoint, repeated announcement...): nothing to celebrate.
		if (totalVictories === undefined || player.Parent !== Players) return;

		const newTitles: string[] = [];
		for (const id of this.getUnlockedTitles(player)) {
			if (!titlesBefore.includes(id)) newTitles.push(id);
		}

		const result: CompletionResult = {
			viaSkip: reason === "Skip",
			totalVictories,
			noSkipEarned: noSkip.earned,
			noSkipFirstTime: noSkip.firstTime,
			newTitles,
		};
		log.debug(`${player.Name}: presenting completion (victory #${result.totalVictories})`);
		this.runCompletedRemote.FireClient(player, result);
	}

	private getUnlockedTitles(player: Player): string[] {
		return this.titles.getInfo(player)?.unlocked ?? [];
	}
}
