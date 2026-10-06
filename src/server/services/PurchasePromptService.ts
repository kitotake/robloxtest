import { MarketplaceService, Players } from "@rbxts/services";
import { isProductConfigured, MonetizationConfig } from "shared/config/MonetizationConfig";
import { SKIPS } from "shared/config/SkipConfig";
import { getRemoteEvent, RemoteNames } from "shared/remotes";
import { createLogger } from "shared/util/Logger";
import { DataService } from "./DataService";
import { NoticeService } from "./NoticeService";
import { ProgressionService } from "./ProgressionService";

const log = createLogger("PurchasePromptService");

/**
 * Receives "I'd like to buy X" requests from clients, validates them against
 * the server-side config and opens the Roblox purchase prompt. The request
 * carries no price, amount or product ID; the purchase itself is granted only
 * by ProcessReceipt.
 */
export class PurchasePromptService {
	private readonly requestRemote = getRemoteEvent(RemoteNames.RequestPurchase);
	private readonly lastRequest = new Map<Player, number>();

	constructor(
		private readonly data: DataService,
		private readonly progression: ProgressionService,
		private readonly notices: NoticeService,
	) {}

	start(): void {
		this.requestRemote.OnServerEvent.Connect((player, kind: unknown, optionId: unknown) =>
			this.onRequest(player, kind, optionId),
		);
		Players.PlayerRemoving.Connect((player) => this.lastRequest.delete(player));
	}

	private onRequest(player: Player, kind: unknown, optionId: unknown): void {
		if (!typeIs(kind, "string") || !typeIs(optionId, "string")) return;

		const now = os.clock();
		const last = this.lastRequest.get(player);
		if (last !== undefined && now - last < MonetizationConfig.REQUEST_COOLDOWN_SECONDS) return;
		this.lastRequest.set(player, now);

		if (this.data.getData(player) === undefined) {
			this.notices.send(player, "error", "Your data is still loading. Try again in a moment.");
			return;
		}

		let productId: number | undefined;
		if (kind === "Skip") {
			productId = SKIPS.find((option) => option.id === optionId)?.productId;
			if (this.progression.getState(player)?.completed === true) {
				this.notices.send(player, "error", "You already reached the end!");
				return;
			}
		} else if (kind === "Donation") {
			productId = MonetizationConfig.DONATIONS.find((option) => option.id === optionId)?.productId;
		}
		if (productId === undefined) return;

		if (!isProductConfigured(productId)) {
			log.warn(`${kind} ${optionId}: Developer Product ID is still a placeholder`);
			this.notices.send(player, "error", "This purchase isn't available yet.");
			return;
		}
		MarketplaceService.PromptProductPurchase(player, productId);
	}
}
