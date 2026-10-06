import { Signal } from "shared/util/Signal";
import { DataService } from "./DataService";

/**
 * Ledger of Robux that confirmed purchases brought to the game. Only called
 * after a purchase has really been processed by Roblox (ProcessReceipt).
 */
export class SupportService {
	/** (player, supportRobuxTotal) — hook for leaderboards. */
	readonly changed = new Signal<[player: Player, supportRobuxTotal: number]>();

	constructor(private readonly data: DataService) {}

	recordDonation(player: Player, robux: number): void {
		const saved = this.requireData(player);
		saved.donationRobux += robux;
		this.refresh(player);
	}

	recordSkip(player: Player, robux: number): void {
		const saved = this.requireData(player);
		saved.skipRobux += robux;
		this.refresh(player);
	}

	private requireData(player: Player) {
		const saved = this.data.getData(player);
		if (saved === undefined) error(`No loaded data for ${player.Name}`);
		return saved;
	}

	private refresh(player: Player): void {
		const saved = this.requireData(player);
		saved.supportRobuxTotal = saved.donationRobux + saved.skipRobux;
		this.changed.fire(player, saved.supportRobuxTotal);
	}
}
