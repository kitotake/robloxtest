import { PLACEHOLDER_PRODUCT_ID } from "./MonetizationConfig";

export interface RobuxProduct {
	/** PLACEHOLDER until the Developer Product exists in the Creator Hub. */
	readonly productId: number;
	/** Price shown in the UI. PLACEHOLDER: 0 means "not decided yet" (no price is displayed). */
	readonly priceRobux: number;
}

/**
 * Checkpoint = a persistent position the player can later recover to.
 * The live step of a session is never saved; only this checkpoint is.
 * Every value below is a placeholder balance, not a final design decision.
 */
export const CheckpointConfig = {
	/**
	 * Rewarded videos needed for the 1st, 2nd, 3rd... rewarded checkpoint.
	 * Beyond the end of the list the last value is reused. An empty list disables the video route.
	 */
	REWARDED_CHECKPOINT_REQUIREMENTS: [2, 4, 6, 8] as readonly number[],

	/** Lowest step a checkpoint can be saved on. The highest is MAX_STEP - 1. */
	MIN_CHECKPOINT_STEP: 1,

	/** Robux alternative to the videos: buys one save credit (used immediately when possible). */
	SAVE_PRODUCT: { productId: PLACEHOLDER_PRODUCT_ID, priceRobux: 0 } as RobuxProduct,

	RECOVERY: {
		ALLOW_RUBIES: true,
		/** PLACEHOLDER: final balance not decided. 0 = free recovery. */
		RUBY_COST: 0,
		ALLOW_ROBUX: true,
		/** Buys one recovery credit (used immediately when possible). */
		ROBUX_PRODUCT: { productId: PLACEHOLDER_PRODUCT_ID, priceRobux: 0 } as RobuxProduct,
	},

	/** true: the checkpoint is erased once used. false: it can be recovered again later. */
	CONSUME_CHECKPOINT_ON_RECOVERY: false,
};
