import { EventDefinition } from "shared/config/EventConfig";
import { EventStopReason } from "shared/types/EventTypes";
import { EventContext, EventModule } from "./EventModule";

/** Visual storm (rain, tint, lightning) drawn by the player's client with its own temporary instances. */
export class StormEvent implements EventModule {
	readonly id = "Storm" as const;
	readonly durationSeconds: number;
	readonly cooldownSeconds: number;
	readonly group: string | undefined;

	constructor(
		definition: EventDefinition,
		private readonly ctx: EventContext,
	) {
		this.durationSeconds = definition.durationSeconds;
		this.cooldownSeconds = definition.cooldownSeconds;
		this.group = definition.group;
	}

	start(player: Player): boolean {
		this.ctx.send(player, { eventId: this.id, state: "Start", durationSeconds: this.durationSeconds });
		this.ctx.notify(player, "Storm!");
		return true;
	}

	stop(player: Player, reason: EventStopReason): void {
		if (reason === "Left") return;
		this.ctx.send(player, { eventId: this.id, state: "Stop", durationSeconds: 0 });
	}
}
