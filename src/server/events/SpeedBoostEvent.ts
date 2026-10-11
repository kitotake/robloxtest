import { EventDefinition } from "shared/config/EventConfig";
import { EventStopReason } from "shared/types/EventTypes";
import { EventContext, EventModule } from "./EventModule";

const SOURCE_ID = "event:SpeedBoost";

/**
 * Faster avatar walk, decided and applied by the server through a speed modifier
 * (it multiplies, it never overwrites). It changes how fast the AVATAR walks, not
 * when the next step is granted: the progression timer is untouched.
 */
export class SpeedBoostEvent implements EventModule {
	readonly id = "SpeedBoost" as const;
	readonly durationSeconds: number;
	readonly cooldownSeconds: number;
	readonly group: string | undefined;

	constructor(
		private readonly definition: EventDefinition & { multiplier: number },
		private readonly ctx: EventContext,
	) {
		this.durationSeconds = definition.durationSeconds;
		this.cooldownSeconds = definition.cooldownSeconds;
		this.group = definition.group;
	}

	start(player: Player): boolean {
		if (!this.ctx.speed.add(player, SOURCE_ID, this.definition.multiplier)) return false;
		this.ctx.notify(player, "Speed boost!");
		return true;
	}

	stop(player: Player, _reason: EventStopReason): void {
		this.ctx.speed.remove(player, SOURCE_ID);
	}
}
