import { MarketplaceService, Players } from "@rbxts/services";
import { isProductConfigured, MonetizationConfig } from "shared/config/MonetizationConfig";
import { PlayerData } from "shared/types/PlayerData";
import { createLogger } from "shared/util/Logger";
import { DataService } from "./DataService";

const log = createLogger("PurchaseService");

/** Grants the purchase. Return true only if it was fully granted. */
export type ReceiptHandler = (player: Player, receipt: ReceiptInfo) => boolean;

/**
 * Owns MarketplaceService.ProcessReceipt (Roblox allows a single callback) and
 * dispatches each confirmed purchase to the handler registered for its product.
 * Receipts are idempotent and only acknowledged once the data is saved.
 */
export class PurchaseService {
	private readonly handlers = new Map<number, ReceiptHandler>();

	constructor(private readonly data: DataService) {}

	start(): void {
		MarketplaceService.ProcessReceipt = (receipt) => this.process(receipt);
	}

	/** Placeholder product IDs are ignored so unconfigured products can never be granted. */
	registerProduct(productId: number, label: string, handler: ReceiptHandler): void {
		if (!isProductConfigured(productId)) {
			log.debug(`${label}: product ID not configured yet, purchase disabled`);
			return;
		}
		if (this.handlers.has(productId)) {
			log.warn(`${label}: product ID ${productId} is already used by another product`);
			return;
		}
		this.handlers.set(productId, handler);
	}

	private process(receipt: ReceiptInfo): Enum.ProductPurchaseDecision {
		const player = Players.GetPlayerByUserId(receipt.PlayerId);
		if (player === undefined) return Enum.ProductPurchaseDecision.NotProcessedYet;

		const saved: PlayerData | undefined = this.data.waitForData(
			player,
			MonetizationConfig.DATA_WAIT_TIMEOUT_SECONDS,
		);
		if (saved === undefined) return Enum.ProductPurchaseDecision.NotProcessedYet;

		if (!saved.processedReceipts.includes(receipt.PurchaseId)) {
			const handler = this.handlers.get(receipt.ProductId);
			if (handler === undefined) {
				log.warn(`No handler for product ${receipt.ProductId}`);
				return Enum.ProductPurchaseDecision.NotProcessedYet;
			}

			const [ok, granted] = pcall(() => handler(player, receipt));
			if (!ok || granted !== true) {
				log.warn(`Granting product ${receipt.ProductId} failed for ${player.Name}: ${tostring(granted)}`);
				return Enum.ProductPurchaseDecision.NotProcessedYet;
			}

			saved.processedReceipts.push(receipt.PurchaseId);
			while (saved.processedReceipts.size() > MonetizationConfig.PROCESSED_RECEIPTS_LIMIT) {
				saved.processedReceipts.remove(0);
			}
			log.debug(`Granted product ${receipt.ProductId} to ${player.Name}`);
		}

		// Only acknowledge once the grant is stored; a retry will skip the grant but retry the save.
		return this.data.saveNow(player)
			? Enum.ProductPurchaseDecision.PurchaseGranted
			: Enum.ProductPurchaseDecision.NotProcessedYet;
	}
}
