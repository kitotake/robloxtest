import { EventId } from "shared/types/EventTypes";

/** Settings shared by every event. */
export interface EventDefinition {
	enabled: boolean;
	/** How long the event lasts for the affected player. */
	durationSeconds: number;
	/** Seconds after the event ends before the same event can trigger again for that player. */
	cooldownSeconds: number;
	/** Events of the same group never run together for one player. */
	group?: string;
}

export interface EventSystemConfig {
	/** Master switch. */
	ENABLED: boolean;
	/**
	 * Events are PER PLAYER (progression, movement and atmosphere already are).
	 * One is considered when the player's own automatic walk lands on a milestone step:
	 * every EVERY_STEPS steps, between FIRST_STEP and LAST_STEP.
	 */
	TRIGGER: { EVERY_STEPS: number; FIRST_STEP: number; LAST_STEP: number };
	/** Events running at the same time for one player. */
	MAX_CONCURRENT_PER_PLAYER: number;
	EVENTS: {
		/** Client-side darkness (own ColorCorrection, destroyed at the end). */
		Blackout: EventDefinition & { intensity: number; fadeSeconds: number };
		/** Server-side WalkSpeed multiplier (through SpeedModifierService). */
		SpeedBoost: EventDefinition & { multiplier: number };
		/** Client-side rain, tint and lightning (own instances, destroyed at the end). */
		Storm: EventDefinition & { intensity: number; fadeSeconds: number; lightning: boolean };
	};
}

/** Hard limits: a value outside them is refused (the event is not started / not registered). */
export const EventLimits = {
	MAX_DURATION_SECONDS: 60,
	MAX_COOLDOWN_SECONDS: 3600,
	MAX_CONCURRENT: 3,
	/** Accepted by SpeedModifierService for any single modifier and for the final product. */
	MIN_SPEED_MULTIPLIER: 0.25,
	MAX_SPEED_MULTIPLIER: 3,
	/** SpeedBoost itself must be a real but sane boost. */
	BOOST_MIN: 1.05,
	BOOST_MAX: 2,
	/** Blackout never goes fully black. */
	BLACKOUT_MAX_INTENSITY: 0.8,
	MAX_FADE_SECONDS: 5,
} as const;

/** Fixed order: the only source of order between candidate events (never signal order). */
export const EVENT_ORDER: readonly EventId[] = ["Blackout", "SpeedBoost", "Storm"];

export const EventConfig: EventSystemConfig = {
	ENABLED: true,
	TRIGGER: { EVERY_STEPS: 5, FIRST_STEP: 5, LAST_STEP: 95 },
	MAX_CONCURRENT_PER_PLAYER: 2,
	EVENTS: {
		Blackout: {
			enabled: true,
			durationSeconds: 6,
			cooldownSeconds: 40,
			group: "Screen",
			intensity: 0.55,
			fadeSeconds: 0.8,
		},
		SpeedBoost: { enabled: true, durationSeconds: 8, cooldownSeconds: 30, multiplier: 1.5 },
		Storm: {
			enabled: true,
			durationSeconds: 10,
			cooldownSeconds: 45,
			group: "Screen",
			intensity: 0.7,
			fadeSeconds: 1,
			lightning: true,
		},
	},
};
