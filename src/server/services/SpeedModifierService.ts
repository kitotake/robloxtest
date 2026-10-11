import { Players } from "@rbxts/services";
import { EventLimits } from "shared/config/EventConfig";
import { isFiniteNumber } from "shared/util/EventUtil";
import { createLogger } from "shared/util/Logger";
import { Signal } from "shared/util/Signal";

const log = createLogger("SpeedModifierService");

/**
 * Temporary WalkSpeed multipliers, one per source (e.g. "event:SpeedBoost").
 * The final speed is the base speed times the product of every active modifier,
 * so a modifier never overwrites another one and removing one restores exactly
 * what the others give. AutoMovementService is the only reader: it recomputes
 * the WalkSpeed from the authoritative state each time `changed` fires.
 */
export class SpeedModifierService {
	/** Fired when the final multiplier of a player may have changed. */
	readonly changed = new Signal<[player: Player]>();
	private readonly modifiers = new Map<Player, Map<string, number>>();

	start(): void {
		Players.PlayerRemoving.Connect((player) => this.modifiers.delete(player));
	}

	/** Adds or replaces the modifier of `sourceId` (the same source never stacks with itself). */
	add(player: Player, sourceId: string, multiplier: number): boolean {
		if (
			!isFiniteNumber(multiplier) ||
			multiplier < EventLimits.MIN_SPEED_MULTIPLIER ||
			multiplier > EventLimits.MAX_SPEED_MULTIPLIER
		) {
			log.warn(`Refused speed modifier ${sourceId}=${multiplier} for ${player.Name}`);
			return false;
		}
		let bySource = this.modifiers.get(player);
		if (bySource === undefined) {
			bySource = new Map<string, number>();
			this.modifiers.set(player, bySource);
		}
		bySource.set(sourceId, multiplier);
		this.changed.fire(player);
		return true;
	}

	remove(player: Player, sourceId: string): boolean {
		const bySource = this.modifiers.get(player);
		if (bySource === undefined || !bySource.delete(sourceId)) return false;
		if (bySource.size() === 0) this.modifiers.delete(player);
		this.changed.fire(player);
		return true;
	}

	/** Product of the player's modifiers, clamped to the allowed range (1 when none). */
	getMultiplier(player: Player): number {
		const bySource = this.modifiers.get(player);
		if (bySource === undefined) return 1;
		let product = 1;
		for (const [, multiplier] of bySource) product *= multiplier;
		return math.clamp(product, EventLimits.MIN_SPEED_MULTIPLIER, EventLimits.MAX_SPEED_MULTIPLIER);
	}
}
