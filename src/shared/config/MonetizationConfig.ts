/** Marker for Developer Product IDs that have not been created yet. */
export const PLACEHOLDER_PRODUCT_ID = 0;

export function isProductConfigured(productId: number): boolean {
	return productId > PLACEHOLDER_PRODUCT_ID;
}

export interface DonationOption {
	readonly id: string;
	/** PLACEHOLDER: replace with the real Developer Product ID. */
	readonly productId: number;
	/** Robux price of that product (must match the Creator Hub). */
	readonly robux: number;
}

export const MonetizationConfig = {
	/** Minimum delay between two purchase requests from the same player. */
	REQUEST_COOLDOWN_SECONDS: 1.5,
	/** How long ProcessReceipt waits for a player's data to finish loading. */
	DATA_WAIT_TIMEOUT_SECONDS: 15,
	/** Recent PurchaseIds kept per player to make receipts idempotent. */
	PROCESSED_RECEIPTS_LIMIT: 100,

	DONATIONS: [
		{ id: "DONATE_10", productId: PLACEHOLDER_PRODUCT_ID, robux: 10 },
		{ id: "DONATE_50", productId: PLACEHOLDER_PRODUCT_ID, robux: 50 },
		{ id: "DONATE_100", productId: PLACEHOLDER_PRODUCT_ID, robux: 100 },
		{ id: "DONATE_500", productId: PLACEHOLDER_PRODUCT_ID, robux: 500 },
		{ id: "DONATE_1000", productId: PLACEHOLDER_PRODUCT_ID, robux: 1000 },
	] as readonly DonationOption[],
};
