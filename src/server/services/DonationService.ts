import { DonationOption, MonetizationConfig } from "shared/config/MonetizationConfig";
import { Signal } from "shared/util/Signal";
import { NoticeService } from "./NoticeService";
import { PurchaseService } from "./PurchaseService";
import { SupportService } from "./SupportService";

/** Grants donation purchases confirmed by ProcessReceipt. */
export class DonationService {
	/** (player, robux) — hook for global announcements and leaderboards. */
	readonly donated = new Signal<[player: Player, robux: number]>();

	constructor(
		private readonly purchases: PurchaseService,
		private readonly support: SupportService,
		private readonly notices: NoticeService,
	) {}

	start(): void {
		for (const option of MonetizationConfig.DONATIONS) {
			this.purchases.registerProduct(option.productId, option.id, (player) => this.grant(player, option));
		}
	}

	private grant(player: Player, option: DonationOption): boolean {
		this.support.recordDonation(player, option.robux);
		this.donated.fire(player, option.robux);
		this.notices.send(player, "info", `⭐ Thank you for supporting the game with ${option.robux} Robux!`);
		return true;
	}
}
