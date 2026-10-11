import { EventDefinition } from "shared/config/EventConfig";
import { EventStopReason } from "shared/types/EventTypes";
import { EventContext, EventModule } from "./EventModule";

/**
 * Reduced visibility. The darkness itself is drawn by the player's client with
 * its own temporary instance; the server only decides when it starts and ends.
 */
export class BlackoutEvent implements EventModule {
	readonly id = "Blackout" as const;
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
		this.ctx.notify(player, "Blackout!");
		return true;
	}

	stop(player: Player, reason: EventStopReason): void {
		if (reason === "Left") return;
		this.ctx.send(player, { eventId: this.id, state: "Stop", durationSeconds: 0 });
	}
}
