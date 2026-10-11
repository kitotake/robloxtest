/** A temporary, self-contained visual effect. It owns every instance it creates. */
export interface ClientEffect {
	/** immediate: remove everything now (cancellation, respawn). Otherwise fade out first. Safe to call twice. */
	destroy(immediate: boolean): void;
}
