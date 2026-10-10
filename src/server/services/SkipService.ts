import { SKIPS, SkipOption } from "shared/config/SkipConfig";
import { createLogger } from "shared/util/Logger";
import { Signal } from "shared/util/Signal";
import { NoticeService } from "./NoticeService";
import { ProgressionService } from "./ProgressionService";
import { PurchaseService } from "./PurchaseService";
import { SupportService } from "./SupportService";

const log = createLogger("SkipService");

/** Grants skip purchases confirmed by ProcessReceipt. */
export class SkipService {
	/** (player, fromStep, toStep, option) — hook for the skipped-tiles visual effect. */
	readonly skipped = new Signal<[player: Player, fromStep: number, toStep: number, option: SkipOption]>();

	constructor(
		private readonly progression: ProgressionService,
		private readonly purchases: PurchaseService,
		private readonly support: SupportService,
		private readonly notices: NoticeService,
	) {}

	start(): void {
		for (const option of SKIPS) {
			this.purchases.registerProduct(option.productId, option.id, (player, receipt) =>
				this.grant(player, receipt, option),
			);
		}
	}

	private grant(player: Player, receipt: ReceiptInfo, option: SkipOption): boolean {
		const state = this.progression.getState(player);
		if (state === undefined) return false; // session not started yet: Roblox will retry

		if (receipt.CurrencySpent !== option.priceRobux) {
			log.warn(`${option.id}: configured price ${option.priceRobux} but receipt says ${receipt.CurrencySpent}`);
		}

		const from = state.step;
		// A paid skip ALWAYS ends NO-SKIP eligibility (not configurable). It happens before advancing so
		// a skip that reaches MAX_STEP completes with the flag already cleared.
		this.progression.invalidateNoSkip(player, `skip purchase ${option.id}`);
		this.progression.advancePlayer(player, option.amount, "Skip");
		this.support.recordSkip(player, option.priceRobux);

		const to = this.progression.getProgress(player);
		this.skipped.fire(player, from, to, option);
		this.notices.send(player, "info", `Skipped ${to - from} step${to - from === 1 ? "" : "s"}!`);
		return true;
	}
}
