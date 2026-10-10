import { BadgeService } from "@rbxts/services";
import { NoSkipConfig, PLACEHOLDER_BADGE_ID } from "shared/config/NoSkipConfig";
import { ProgressChangeReason } from "shared/types/ProgressionTypes";
import { isNoSkipEarned } from "shared/util/NoSkipUtil";
import { createLogger } from "shared/util/Logger";
import { Signal } from "shared/util/Signal";
import { ProgressionService } from "./ProgressionService";
import { TitleService } from "./TitleService";

const log = createLogger("NoSkipService");

/** Result of evaluating NO-SKIP for one completed run. */
export interface NoSkipOutcome {
	/** This completion earned NO-SKIP. */
	earned: boolean;
	/** NO-SKIP was earned for the very first time. */
	firstTime: boolean;
}

/**
 * The NO-SKIP achievement. It is decided only by the run state kept on the
 * server (ProgressionService.noSkipEligible, cleared by any paid skip, any
 * checkpoint recovery or a real backward move) at the moment the run is
 * completed. It does not touch the Victory counter, which VictoryService owns.
 * CompletionService calls `evaluateCompletion` once per completed run, so the
 * outcome does not depend on the order in which `runCompleted` handlers run.
 */
export class NoSkipService {
	/** (player, firstTime) — fired when a completed run earned NO-SKIP. */
	readonly noSkipEarned = new Signal<[player: Player, firstTime: boolean]>();

	constructor(
		private readonly progression: ProgressionService,
		private readonly titles: TitleService,
	) {}

	/** Decides NO-SKIP for a run that was just completed and grants it when earned. */
	evaluateCompletion(player: Player, reason: ProgressChangeReason): NoSkipOutcome {
		const state = this.progression.getState(player);
		if (state === undefined) return { earned: false, firstTime: false };
		if (!isNoSkipEarned(state.noSkipEligible, reason)) {
			log.debug(`${player.Name} completed the run without earning NO-SKIP (${reason})`);
			return { earned: false, firstTime: false };
		}

		const firstTime = this.titles.grantSpecial(player, NoSkipConfig.TITLE_ID);
		this.awardBadge(player);
		log.debug(`${player.Name} earned NO-SKIP (first time: ${firstTime})`);
		this.noSkipEarned.fire(player, firstTime);
		return { earned: true, firstTime };
	}

	/** Awards the Roblox badge, but only once a real Badge ID has been configured. */
	private awardBadge(player: Player): void {
		if (NoSkipConfig.BADGE_ID === PLACEHOLDER_BADGE_ID) {
			log.debug("NO-SKIP badge ID is still a placeholder: no badge awarded");
			return;
		}
		task.spawn(() => {
			const [ok, err] = pcall(() =>
				BadgeService.AwardBadgeAsync(player.UserId as unknown as User, NoSkipConfig.BADGE_ID),
			);
			if (!ok) log.warn(`Awarding the NO-SKIP badge to ${player.Name} failed: ${tostring(err)}`);
		});
	}
}
