import { EVENT_ORDER, EventLimits, EventSystemConfig } from "shared/config/EventConfig";
import { ProgressChangeReason } from "shared/types/ProgressionTypes";
import { EventId, EventMessage } from "shared/types/EventTypes";

export function isFiniteNumber(value: unknown): value is number {
	return typeIs(value, "number") && value === value && value > -math.huge && value < math.huge;
}

function isInteger(value: unknown): value is number {
	return isFiniteNumber(value) && value === math.floor(value);
}

export function isEventId(value: unknown): value is EventId {
	return typeIs(value, "string") && EVENT_ORDER.includes(value as EventId);
}

export interface EventConfigReport {
	/** False when the master switch is off or the trigger settings are invalid: nothing ever starts. */
	systemEnabled: boolean;
	/** Events that are enabled AND valid. An invalid event is refused, the others still work. */
	enabledEvents: EventId[];
	errors: string[];
}

/** Checks the whole configuration. Pure: used by the server at startup and by the tests. */
export function validateEventConfig(config: EventSystemConfig, maxStep: number): EventConfigReport {
	const errors: string[] = [];
	const enabledEvents: EventId[] = [];
	if (config.ENABLED !== true) return { systemEnabled: false, enabledEvents, errors };

	const trigger = config.TRIGGER;
	let systemOk = true;
	if (!isInteger(trigger.EVERY_STEPS) || trigger.EVERY_STEPS < 1 || trigger.EVERY_STEPS >= maxStep) {
		errors.push("TRIGGER.EVERY_STEPS must be an integer in [1, MAX_STEP)");
		systemOk = false;
	}
	if (!isInteger(trigger.FIRST_STEP) || trigger.FIRST_STEP < 1 || trigger.FIRST_STEP >= maxStep) {
		errors.push("TRIGGER.FIRST_STEP must be an integer in [1, MAX_STEP)");
		systemOk = false;
	}
	if (!isInteger(trigger.LAST_STEP) || trigger.LAST_STEP < trigger.FIRST_STEP || trigger.LAST_STEP >= maxStep) {
		errors.push("TRIGGER.LAST_STEP must be an integer in [FIRST_STEP, MAX_STEP)");
		systemOk = false;
	}
	if (
		!isInteger(config.MAX_CONCURRENT_PER_PLAYER) ||
		config.MAX_CONCURRENT_PER_PLAYER < 1 ||
		config.MAX_CONCURRENT_PER_PLAYER > EventLimits.MAX_CONCURRENT
	) {
		errors.push(`MAX_CONCURRENT_PER_PLAYER must be an integer in [1, ${EventLimits.MAX_CONCURRENT}]`);
		systemOk = false;
	}
	if (!systemOk) return { systemEnabled: false, enabledEvents, errors };

	for (const id of EVENT_ORDER) {
		const definition = config.EVENTS[id];
		if (definition.enabled !== true) continue;
		const problems: string[] = [];
		if (
			!isFiniteNumber(definition.durationSeconds) ||
			definition.durationSeconds <= 0 ||
			definition.durationSeconds > EventLimits.MAX_DURATION_SECONDS
		) {
			problems.push(`durationSeconds must be in (0, ${EventLimits.MAX_DURATION_SECONDS}]`);
		}
		if (
			!isFiniteNumber(definition.cooldownSeconds) ||
			definition.cooldownSeconds < 0 ||
			definition.cooldownSeconds > EventLimits.MAX_COOLDOWN_SECONDS
		) {
			problems.push(`cooldownSeconds must be in [0, ${EventLimits.MAX_COOLDOWN_SECONDS}]`);
		}
		if (id === "SpeedBoost") {
			const boost = config.EVENTS.SpeedBoost;
			if (
				!isFiniteNumber(boost.multiplier) ||
				boost.multiplier < EventLimits.BOOST_MIN ||
				boost.multiplier > EventLimits.BOOST_MAX
			) {
				problems.push(`multiplier must be in [${EventLimits.BOOST_MIN}, ${EventLimits.BOOST_MAX}]`);
			}
		} else if (id === "Blackout") {
			const blackout = config.EVENTS.Blackout;
			if (
				!isFiniteNumber(blackout.intensity) ||
				blackout.intensity <= 0 ||
				blackout.intensity > EventLimits.BLACKOUT_MAX_INTENSITY
			) {
				problems.push(`intensity must be in (0, ${EventLimits.BLACKOUT_MAX_INTENSITY}]`);
			}
			if (
				!isFiniteNumber(blackout.fadeSeconds) ||
				blackout.fadeSeconds < 0 ||
				blackout.fadeSeconds > EventLimits.MAX_FADE_SECONDS
			) {
				problems.push(`fadeSeconds must be in [0, ${EventLimits.MAX_FADE_SECONDS}]`);
			}
		} else {
			const storm = config.EVENTS.Storm;
			if (!isFiniteNumber(storm.intensity) || storm.intensity <= 0 || storm.intensity > 1) {
				problems.push("intensity must be in (0, 1]");
			}
			if (
				!isFiniteNumber(storm.fadeSeconds) ||
				storm.fadeSeconds < 0 ||
				storm.fadeSeconds > EventLimits.MAX_FADE_SECONDS
			) {
				problems.push(`fadeSeconds must be in [0, ${EventLimits.MAX_FADE_SECONDS}]`);
			}
		}
		if (problems.size() > 0) {
			for (const problem of problems) errors.push(`${id}: ${problem}`);
			continue;
		}
		enabledEvents.push(id);
	}
	return { systemEnabled: enabledEvents.size() > 0, enabledEvents, errors };
}

/**
 * A milestone is only ever created by the player's own automatic walk (+1 step):
 * skips, checkpoint recoveries, resets, admin moves and jumps never trigger an event.
 */
export function isTriggerStep(
	trigger: EventSystemConfig["TRIGGER"],
	oldStep: number,
	newStep: number,
	reason: ProgressChangeReason,
): boolean {
	if (reason !== "Auto") return false;
	if (!isInteger(oldStep) || !isInteger(newStep) || newStep !== oldStep + 1) return false;
	if (newStep < trigger.FIRST_STEP || newStep > trigger.LAST_STEP) return false;
	return newStep % trigger.EVERY_STEPS === 0;
}

/** Validates what the client receives. Anything unknown or out of range is refused (returns undefined). */
export function parseEventMessage(payload: unknown): EventMessage | undefined {
	if (!typeIs(payload, "table")) return undefined;
	const record = payload as Record<string, unknown>;
	const eventId = record.eventId;
	const state = record.state;
	const duration = record.durationSeconds;
	if (!isEventId(eventId)) return undefined;
	if (state !== "Start" && state !== "Stop") return undefined;
	if (!isFiniteNumber(duration) || duration < 0 || duration > EventLimits.MAX_DURATION_SECONDS) return undefined;
	if (state === "Start" && duration <= 0) return undefined;
	return { eventId, state, durationSeconds: duration };
}
