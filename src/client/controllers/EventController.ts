import { Players } from "@rbxts/services";
import { EventConfig } from "shared/config/EventConfig";
import { getRemoteEvent, getRemoteFunction, RemoteNames } from "shared/remotes";
import { EventId } from "shared/types/EventTypes";
import { parseEventMessage } from "shared/util/EventUtil";
import { createBlackoutEffect } from "../effects/BlackoutEffect";
import { ClientEffect } from "../effects/ClientEffect";
import { createStormEffect } from "../effects/StormEffect";

interface RunningEffect {
	effect: ClientEffect;
	token: number;
}

/**
 * Cosmetic only. Plays the visual events the SERVER announces to this player.
 * It has no way to start, extend or choose an event: it validates every message
 * (unknown event, bad state or bad duration are ignored), takes the look of the
 * effect from the shared config, and never keeps an effect longer than the
 * server-given duration (a lost "Stop" message cannot leave it on screen).
 * Respawning clears everything. SpeedBoost has no client part (server-side only).
 */
export class EventController {
	private readonly running = new Map<EventId, RunningEffect>();
	private tokenCounter = 0;
	private playerGui!: PlayerGui;

	start(): void {
		this.playerGui = Players.LocalPlayer.WaitForChild("PlayerGui") as PlayerGui;
		getRemoteEvent(RemoteNames.EventStateChanged).OnClientEvent.Connect((payload: unknown) =>
			this.onMessage(payload),
		);
		// A new character never inherits an effect.
		Players.LocalPlayer.CharacterAdded.Connect(() => this.clearAll());
		task.spawn(() => this.syncRunningEvents());
	}

	/** Catches up with an event that started before this controller was listening. */
	private syncRunningEvents(): void {
		const [ok, result] = pcall(() => getRemoteFunction(RemoteNames.GetActiveEvents).InvokeServer());
		if (!ok || !typeIs(result, "table")) return;
		for (const entry of result as unknown[]) this.onMessage(entry);
	}

	private onMessage(payload: unknown): void {
		const message = parseEventMessage(payload);
		if (message === undefined) return;
		if (message.state === "Stop") this.stop(message.eventId, false);
		else this.begin(message.eventId, message.durationSeconds);
	}

	private begin(id: EventId, durationSeconds: number): void {
		const definition = EventConfig.EVENTS[id];
		if (!definition.enabled) return;
		if (id === "SpeedBoost") return; // nothing to draw: the boost is applied by the server

		this.stop(id, true); // restart instead of stacking
		const effect = id === "Blackout" ? createBlackoutEffect() : createStormEffect(this.playerGui);
		this.tokenCounter += 1;
		const token = this.tokenCounter;
		this.running.set(id, { effect, token });
		// Safety: never longer than the server-given (and configured) duration.
		task.delay(math.min(durationSeconds, definition.durationSeconds) + 0.25, () => {
			if (this.running.get(id)?.token === token) this.stop(id, false);
		});
	}

	private stop(id: EventId, immediate: boolean): void {
		const current = this.running.get(id);
		if (current === undefined) return;
		this.running.delete(id);
		current.effect.destroy(immediate);
	}

	private clearAll(): void {
		for (const [id] of this.running) this.stop(id, true);
	}
}
