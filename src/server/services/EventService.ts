import { Players } from "@rbxts/services";
import { BlackoutEvent } from "server/events/BlackoutEvent";
import { EventContext, EventModule } from "server/events/EventModule";
import { SpeedBoostEvent } from "server/events/SpeedBoostEvent";
import { StormEvent } from "server/events/StormEvent";
import { EVENT_ORDER, EventConfig, EventSystemConfig } from "shared/config/EventConfig";
import { GameConfig } from "shared/config/GameConfig";
import { getRemoteEvent, getRemoteFunction, RemoteNames } from "shared/remotes";
import { EventId, EventMessage, EventStopReason } from "shared/types/EventTypes";
import { ProgressChangeReason } from "shared/types/ProgressionTypes";
import { EventConfigReport, isTriggerStep, validateEventConfig } from "shared/util/EventUtil";
import { createLogger } from "shared/util/Logger";
import { Signal } from "shared/util/Signal";
import { NoticeService } from "./NoticeService";
import { ProgressionService } from "./ProgressionService";
import { SpeedModifierService } from "./SpeedModifierService";

const log = createLogger("EventService");

/** One-shot timer. `delay` returns a function that cancels it. */
export interface EventScheduler {
	delay(seconds: number, callback: () => void): () => void;
}

/** Everything the tests need to replace (clock, timers, randomness, "is the player alive"). */
export interface EventServiceDeps {
	config?: EventSystemConfig;
	now?: () => number;
	scheduler?: EventScheduler;
	/** Returns an index in [0, count). */
	pickIndex?: (count: number) => number;
	isAlive?: (player: Player) => boolean;
}

interface ActiveEvent {
	token: number;
	cancel: () => void;
	endsAt: number;
}

interface PlayerEvents {
	active: Map<EventId, ActiveEvent>;
	/** Earliest time the event may start again. */
	cooldownUntil: Map<EventId, number>;
	/** Milestone steps already decided during this run: one decision per milestone. */
	decidedSteps: Set<number>;
	connections: RBXScriptConnection[];
	died: RBXScriptConnection | undefined;
}

const defaultScheduler: EventScheduler = {
	delay(seconds, callback) {
		const thread = task.delay(seconds, callback);
		return () => {
			pcall(() => task.cancel(thread));
		};
	},
};

function isCharacterAlive(player: Player): boolean {
	const humanoid = player.Character?.FindFirstChildOfClass("Humanoid");
	return humanoid !== undefined && humanoid.Health > 0;
}

/**
 * Central manager of the dynamic events. Events are PER PLAYER: each player's own
 * automatic walk decides when one is considered, and its effects only ever touch
 * that player (WalkSpeed modifier on their humanoid, cues to their own client).
 * Nothing is global, nothing is saved, and nothing here can change progression,
 * victories, titles, rewards or No-Skip.
 *
 * Rules:
 * - A milestone is the player's own Auto step landing on a multiple of EVERY_STEPS
 *   (see isTriggerStep). Each milestone is decided once per run, so repeated
 *   notifications cannot start a second event for the same step.
 * - At most one new event per milestone, chosen among the eligible ones (enabled,
 *   not running, not cooling down, group free, concurrency not full).
 * - Duration = one timer per event (no polling loop). Every stop, whatever its
 *   cause (expiry, death, respawn, reset, completion, leaving), goes through
 *   `finish`, which is guarded by a token so a stale timer can never stop a newer event.
 * - Nothing depends on signal handler order: the reactions only read the
 *   authoritative state and are idempotent.
 */
export class EventService {
	/** (player, eventId) */
	readonly eventStarted = new Signal<[player: Player, eventId: EventId]>();
	/** (player, eventId, reason) */
	readonly eventStopped = new Signal<[player: Player, eventId: EventId, reason: EventStopReason]>();

	private readonly config: EventSystemConfig;
	private readonly report: EventConfigReport;
	private readonly modules = new Map<EventId, EventModule>();
	private readonly playerEvents = new Map<Player, PlayerEvents>();
	private readonly stateRemote = getRemoteEvent(RemoteNames.EventStateChanged);
	private readonly activeRequest = getRemoteFunction(RemoteNames.GetActiveEvents);
	private readonly now: () => number;
	private readonly scheduler: EventScheduler;
	private readonly pickIndex: (count: number) => number;
	private readonly isAlive: (player: Player) => boolean;
	private tokenCounter = 0;

	constructor(
		private readonly progression: ProgressionService,
		speed: SpeedModifierService,
		notices: NoticeService,
		deps: EventServiceDeps = {},
	) {
		this.config = deps.config ?? EventConfig;
		this.now = deps.now ?? (() => os.clock());
		this.scheduler = deps.scheduler ?? defaultScheduler;
		this.isAlive = deps.isAlive ?? isCharacterAlive;
		if (deps.pickIndex !== undefined) {
			this.pickIndex = deps.pickIndex;
		} else {
			const random = new Random();
			this.pickIndex = (count) => random.NextInteger(0, count - 1);
		}

		this.report = validateEventConfig(this.config, GameConfig.MAX_STEP);
		const stateRemote = this.stateRemote;
		const ctx: EventContext = {
			speed,
			send(player, message) {
				stateRemote.FireClient(player, message);
			},
			notify(player, text) {
				notices.send(player, "info", text);
			},
		};
		for (const id of this.report.enabledEvents) {
			if (id === "Blackout") this.modules.set(id, new BlackoutEvent(this.config.EVENTS.Blackout, ctx));
			else if (id === "SpeedBoost") this.modules.set(id, new SpeedBoostEvent(this.config.EVENTS.SpeedBoost, ctx));
			else this.modules.set(id, new StormEvent(this.config.EVENTS.Storm, ctx));
		}
	}

	start(): void {
		for (const problem of this.report.errors) log.warn(`Event configuration refused: ${problem}`);
		// Read-only: whatever the arguments, a caller only ever gets their own running events.
		this.activeRequest.OnServerInvoke = (player) => this.buildActiveMessages(player);

		if (!this.report.systemEnabled) {
			log.debug("Dynamic events are disabled (switch off or no valid event)");
			return;
		}

		Players.PlayerAdded.Connect((player) => this.hookPlayer(player));
		Players.PlayerRemoving.Connect((player) => this.releasePlayer(player));
		for (const player of Players.GetPlayers()) this.hookPlayer(player);

		this.progression.changed.connect((player, newStep, oldStep, reason) =>
			this.onProgressChanged(player, newStep, oldStep, reason),
		);
		this.progression.runCompleted.connect((player) => this.cancelAll(player, "Completed"));
	}

	/** Running events of a player, in the fixed EVENT_ORDER. */
	getActiveEvents(player: Player): EventId[] {
		const events = this.playerEvents.get(player);
		const ids: EventId[] = [];
		if (events === undefined) return ids;
		for (const id of EVENT_ORDER) if (events.active.has(id)) ids.push(id);
		return ids;
	}

	/** Ends every running event of the player (fixed order) and restores what they changed. */
	cancelAll(player: Player, reason: EventStopReason): void {
		const events = this.playerEvents.get(player);
		if (events === undefined) return;
		for (const id of EVENT_ORDER) {
			const active = events.active.get(id);
			if (active !== undefined) this.finish(player, id, active.token, reason);
		}
	}

	private onProgressChanged(player: Player, newStep: number, oldStep: number, reason: ProgressChangeReason): void {
		if (reason === "Reset") {
			// A brand-new run: nothing from the previous one survives.
			this.cancelAll(player, "Reset");
			const events = this.playerEvents.get(player);
			if (events !== undefined) {
				events.decidedSteps.clear();
				events.cooldownUntil.clear();
			}
			return;
		}
		if (!isTriggerStep(this.config.TRIGGER, oldStep, newStep, reason)) return;

		const state = this.progression.getState(player);
		if (state === undefined || state.completed || state.step !== newStep) return;

		const events = this.getEvents(player);
		if (events.decidedSteps.has(newStep)) return; // repeated notification for the same milestone
		events.decidedSteps.add(newStep);

		if (!this.isAlive(player)) return; // no event for a dead or absent character
		const module = this.pickEvent(events);
		if (module !== undefined) this.startEvent(player, events, module);
	}

	private pickEvent(events: PlayerEvents): EventModule | undefined {
		if (events.active.size() >= this.config.MAX_CONCURRENT_PER_PLAYER) return undefined;
		const now = this.now();
		const candidates: EventModule[] = [];
		for (const id of EVENT_ORDER) {
			const module = this.modules.get(id);
			if (module === undefined || events.active.has(id)) continue;
			if (now < (events.cooldownUntil.get(id) ?? 0)) continue;
			if (module.group !== undefined && this.isGroupBusy(events, module.group)) continue;
			candidates.push(module);
		}
		if (candidates.size() === 0) return undefined;
		const index = math.clamp(math.floor(this.pickIndex(candidates.size())), 0, candidates.size() - 1);
		return candidates[index];
	}

	private isGroupBusy(events: PlayerEvents, group: string): boolean {
		for (const [id] of events.active) {
			if (this.modules.get(id)?.group === group) return true;
		}
		return false;
	}

	private startEvent(player: Player, events: PlayerEvents, module: EventModule): void {
		this.tokenCounter += 1;
		const token = this.tokenCounter;
		const cancel = this.scheduler.delay(module.durationSeconds, () =>
			this.finish(player, module.id, token, "Expired"),
		);
		events.active.set(module.id, { token, cancel, endsAt: this.now() + module.durationSeconds });

		const [ok, result] = pcall(() => module.start(player));
		if (!ok || result !== true) {
			// Could not be applied: undo anything partial and leave no trace (no cooldown either).
			cancel();
			events.active.delete(module.id);
			pcall(() => module.stop(player, "Expired"));
			log.warn(`${module.id} could not start for ${player.Name}`);
			return;
		}
		log.debug(`${module.id} started for ${player.Name} (${module.durationSeconds}s)`);
		this.eventStarted.fire(player, module.id);
	}

	/** The only way an event ends. A stale call (older token) does nothing. */
	private finish(player: Player, id: EventId, token: number, reason: EventStopReason): void {
		const events = this.playerEvents.get(player);
		const active = events?.active.get(id);
		const module = this.modules.get(id);
		if (events === undefined || active === undefined || module === undefined || active.token !== token) return;

		events.active.delete(id);
		// An expiring timer is already finished; cancelling it from inside itself would cut this function short.
		if (reason !== "Expired") active.cancel();
		const [ok, err] = pcall(() => module.stop(player, reason));
		if (!ok) log.warn(`${id} failed to stop cleanly for ${player.Name}: ${err}`);
		events.cooldownUntil.set(id, this.now() + module.cooldownSeconds);
		log.debug(`${id} stopped for ${player.Name} (${reason})`);
		this.eventStopped.fire(player, id, reason);
	}

	private getEvents(player: Player): PlayerEvents {
		let events = this.playerEvents.get(player);
		if (events === undefined) {
			events = {
				active: new Map(),
				cooldownUntil: new Map(),
				decidedSteps: new Set(),
				connections: [],
				died: undefined,
			};
			this.playerEvents.set(player, events);
		}
		return events;
	}

	private hookPlayer(player: Player): void {
		const events = this.getEvents(player);
		events.connections.push(player.CharacterAdded.Connect((character) => this.hookCharacter(player, character)));
		if (player.Character !== undefined) this.hookCharacter(player, player.Character);
	}

	private hookCharacter(player: Player, character: Model): void {
		// A new character always starts clean: nothing is carried over a respawn.
		this.cancelAll(player, "Respawn");
		task.spawn(() => {
			const humanoid = character.WaitForChild("Humanoid", 10) as Humanoid | undefined;
			const events = this.playerEvents.get(player);
			if (humanoid === undefined || events === undefined || player.Character !== character) return;
			events.died?.Disconnect();
			events.died = humanoid.Died.Connect(() => this.cancelAll(player, "Died"));
		});
	}

	private releasePlayer(player: Player): void {
		this.cancelAll(player, "Left");
		const events = this.playerEvents.get(player);
		if (events === undefined) return;
		for (const connection of events.connections) connection.Disconnect();
		events.died?.Disconnect();
		this.playerEvents.delete(player);
	}

	private buildActiveMessages(player: Player): EventMessage[] {
		const messages: EventMessage[] = [];
		const events = this.playerEvents.get(player);
		if (events === undefined) return messages;
		for (const id of EVENT_ORDER) {
			const active = events.active.get(id);
			if (active === undefined) continue;
			messages.push({ eventId: id, state: "Start", durationSeconds: math.max(active.endsAt - this.now(), 0.1) });
		}
		return messages;
	}
}
