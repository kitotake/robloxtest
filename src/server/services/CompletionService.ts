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

interface CompletionWindow {
	reason: ProgressChangeReason;
	totalVictories: number | undefined;
	noSkipEarned: boolean;
	noSkipFirstTime: boolean;
	newTitles: string[];
}

/**
 * The presentation layer around a completed run. It decides nothing: the
 * Victory, the NO-SKIP achievement and the titles are each granted by their own
 * service. This one only gathers what they granted during the completion and
 * sends one summary to the player's screen.
 *
 * It must be started BEFORE VictoryService, NoSkipService and TitleService so
 * that its window is already open when they react to the same completion.
 */
export class CompletionService {
	private readonly windows = new Map<Player, CompletionWindow>();
	private readonly runCompletedRemote = getRemoteEvent(RemoteNames.RunCompleted);

	constructor(
		private readonly progression: ProgressionService,
		private readonly victories: VictoryService,
		private readonly noSkip: NoSkipService,
		private readonly titles: TitleService,
	) {}

	start(): void {
		this.progression.runCompleted.connect((player, reason) => {
			this.windows.set(player, {
				reason,
				totalVictories: undefined,
				noSkipEarned: false,
				noSkipFirstTime: false,
				newTitles: [],
			});
			// Deferred: runs once every service has reacted to this completion.
			task.defer(() => this.present(player));
		});
		this.victories.victoryRecorded.connect((player, total) => {
			const window = this.windows.get(player);
			if (window !== undefined) window.totalVictories = total;
		});
		this.noSkip.noSkipEarned.connect((player, firstTime) => {
			const window = this.windows.get(player);
			if (window === undefined) return;
			window.noSkipEarned = true;
			window.noSkipFirstTime = firstTime;
		});
		this.titles.titleUnlocked.connect((player, titleId) => {
			this.windows.get(player)?.newTitles.push(titleId);
		});
		Players.PlayerRemoving.Connect((player) => this.windows.delete(player));
	}

	private present(player: Player): void {
		const window = this.windows.get(player);
		this.windows.delete(player);
		// No Victory was counted (admin completion, checkpoint...): nothing to celebrate.
		if (window === undefined || window.totalVictories === undefined || player.Parent !== Players) return;

		const result: CompletionResult = {
			viaSkip: window.reason === "Skip",
			totalVictories: window.totalVictories,
			noSkipEarned: window.noSkipEarned,
			noSkipFirstTime: window.noSkipFirstTime,
			newTitles: window.newTitles,
		};
		log.debug(`${player.Name}: presenting completion (victory #${result.totalVictories})`);
		this.runCompletedRemote.FireClient(player, result);
	}
}
