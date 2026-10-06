import { PLACEHOLDER_PRODUCT_ID } from "./MonetizationConfig";

export interface SkipOption {
	readonly id: string;
	/** Steps gained (never past MAX_STEP). */
	readonly amount: number;
	/**
	 * Developer Product ID from the Creator Hub.
	 * PLACEHOLDER: replace PLACEHOLDER_PRODUCT_ID with the real ID.
	 */
	readonly productId: number;
	/**
	 * Robux price of that Developer Product. Counted as `skipRobux` once the
	 * purchase is confirmed. Must match the price set in the Creator Hub.
	 */
	readonly priceRobux: number;
}

export const SKIPS: readonly SkipOption[] = [
	{ id: "SKIP_1", amount: 1, productId: PLACEHOLDER_PRODUCT_ID, priceRobux: 3 },
	{ id: "SKIP_15", amount: 15, productId: PLACEHOLDER_PRODUCT_ID, priceRobux: 20 },
	{ id: "SKIP_95", amount: 95, productId: PLACEHOLDER_PRODUCT_ID, priceRobux: 355 },
];
