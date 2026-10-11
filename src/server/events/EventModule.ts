import { SpeedModifierService } from "server/services/SpeedModifierService";
import { EventId, EventMessage, EventStopReason } from "shared/types/EventTypes";

/** What an event module is allowed to touch. Nothing here can change progression, victories, titles or No-Skip. */
export interface EventContext {
	speed: SpeedModifierService;
	/** Cosmetic cue to ONE player's client. */
	send(player: Player, message: EventMessage): void;
	/** Short feedback line on that player's screen. */
	notify(player: Player, text: string): void;
}

/**
 * One independent event. EventService decides when it starts and stops, and
 * calls `stop` exactly once per successful `start`, whatever the reason.
 * Both calls must be safe to repeat.
 */
export interface EventModule {
	readonly id: EventId;
	readonly durationSeconds: number;
	readonly cooldownSeconds: number;
	readonly group: string | undefined;
	/** Applies the effect for this player only. Returns false if it could not be applied. */
	start(player: Player): boolean;
	/** Removes exactly what `start` applied. */
	stop(player: Player, reason: EventStopReason): void;
}
