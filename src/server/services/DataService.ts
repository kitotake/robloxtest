import { DataStoreService, Players, RunService } from "@rbxts/services";
import { GameConfig } from "shared/config/GameConfig";
import { DATA_VERSION, PlayerData, SessionLock, StoredPlayerData } from "shared/types/PlayerData";
import { createLogger } from "shared/util/Logger";
import { Signal } from "shared/util/Signal";

const log = createLogger("DataService");
const { DATA } = GameConfig;

interface Session {
	data: PlayerData;
	/** false for Studio fallback sessions: never written to the DataStore. */
	persist: boolean;
}

export function createDefaultPlayerData(): PlayerData {
	return {
		version: DATA_VERSION,
		step: 0,
		noSkipEligible: true,
		victories: 0,
		donationRobux: 0,
		skipRobux: 0,
		supportRobuxTotal: 0,
		rubies: 0,
		totalPlayTime: 0,
		unlockedTitles: [],
		processedReceipts: [],
	};
}

function readNumber(value: unknown, fallback: number): number {
	return typeIs(value, "number") && value === value ? value : fallback;
}

function readCount(value: unknown): number {
	return math.max(0, math.floor(readNumber(value, 0)));
}

function readStrings(value: unknown): string[] {
	const result: string[] = [];
	if (typeIs(value, "table")) {
		for (const entry of value as unknown[]) {
			if (typeIs(entry, "string")) result.push(entry);
		}
	}
	return result;
}

/** Fills missing fields and repairs invalid values from whatever was stored. */
function sanitize(raw: Partial<StoredPlayerData> | undefined): PlayerData {
	if (raw === undefined || !typeIs(raw, "table")) return createDefaultPlayerData();
	const donationRobux = readCount(raw.donationRobux);
	const skipRobux = readCount(raw.skipRobux);
	return {
		version: DATA_VERSION,
		step: math.clamp(readCount(raw.step), 0, GameConfig.MAX_STEP),
		noSkipEligible: typeIs(raw.noSkipEligible, "boolean") ? raw.noSkipEligible : true,
		victories: readCount(raw.victories),
		donationRobux,
		skipRobux,
		supportRobuxTotal: donationRobux + skipRobux,
		rubies: readCount(raw.rubies),
		totalPlayTime: math.max(0, readNumber(raw.totalPlayTime, 0)),
		unlockedTitles: readStrings(raw.unlockedTitles),
		processedReceipts: readStrings(raw.processedReceipts),
	};
}

type ClaimResult = { status: "claimed"; data: PlayerData } | { status: "locked" } | { status: "error" };

/**
 * Persistence layer. One DataStore key per player, claimed with a session lock
 * (so two servers never write the same player) and written with UpdateAsync.
 * Data that failed to load is never saved over the stored data.
 */
export class DataService {
	/** Fired once a player's data is loaded and available through getData. */
	readonly loaded = new Signal<[player: Player]>();

	private readonly store = DataStoreService.GetDataStore(DATA.STORE_NAME);
	private readonly sessions = new Map<Player, Session>();
	private readonly releasing = new Set<Player>();
	private autosaveElapsed = 0;

	start(): void {
		Players.PlayerAdded.Connect((player) => task.spawn(() => this.loadPlayer(player)));
		Players.PlayerRemoving.Connect((player) => task.spawn(() => this.releasePlayer(player)));
		for (const player of Players.GetPlayers()) task.spawn(() => this.loadPlayer(player));

		RunService.Heartbeat.Connect((dt) => this.autosave(dt));
		game.BindToClose(() => this.onShutdown());
	}

	getData(player: Player): PlayerData | undefined {
		return this.sessions.get(player)?.data;
	}

	/** Yields until the player's data is loaded, or returns undefined after the timeout. */
	waitForData(player: Player, timeoutSeconds: number): PlayerData | undefined {
		const existing = this.getData(player);
		if (existing !== undefined) return existing;

		const thread = coroutine.running();
		let finished = false;
		let disconnect: () => void = () => {};
		const finish = () => {
			if (finished) return;
			finished = true;
			disconnect();
			task.spawn(thread);
		};
		disconnect = this.loaded.connect((loadedPlayer) => {
			if (loadedPlayer === player) finish();
		});
		task.delay(timeoutSeconds, finish);
		coroutine.yield();
		return this.getData(player);
	}

	/** Writes the player's data now (single attempt). Returns true if it is safely stored. */
	saveNow(player: Player): boolean {
		return this.write(player, false, 1);
	}

	private key(player: Player): string {
		return `${DATA.KEY_PREFIX}${player.UserId}`;
	}

	private newLock(): SessionLock {
		return { jobId: game.JobId, time: os.time() };
	}

	private isLockedByOther(lock: SessionLock | undefined): boolean {
		return (
			lock !== undefined && lock.jobId !== game.JobId && os.time() - lock.time < DATA.SESSION_LOCK_TIMEOUT_SECONDS
		);
	}

	private loadPlayer(player: Player): void {
		if (this.sessions.has(player)) return;
		const fallbackAllowed = DATA.ALLOW_STUDIO_FALLBACK && RunService.IsStudio();

		for (let attempt = 1; attempt <= DATA.LOAD_ATTEMPTS; attempt++) {
			if (player.Parent !== Players) return;
			const result = this.claim(player);
			if (result.status === "claimed") {
				this.openSession(player, result.data, true);
				return;
			}
			log.warn(`Load attempt ${attempt}/${DATA.LOAD_ATTEMPTS} for ${player.Name}: ${result.status}`);
			if (result.status === "error" && fallbackAllowed) break; // DataStore unreachable in Studio
			if (attempt < DATA.LOAD_ATTEMPTS) task.wait(DATA.RETRY_DELAY_SECONDS);
		}

		if (fallbackAllowed) {
			log.warn(`Studio fallback for ${player.Name}: temporary data, nothing will be saved`);
			this.openSession(player, createDefaultPlayerData(), false);
			return;
		}
		player.Kick("Your data could not be loaded. Please rejoin in a moment.");
	}

	/** Claims the session lock and returns the sanitized stored data. */
	private claim(player: Player): ClaimResult {
		const out: { data?: PlayerData; locked: boolean } = { locked: false };
		const [ok, err] = pcall(() => {
			this.store.UpdateAsync<StoredPlayerData, StoredPlayerData>(this.key(player), (old) => {
				if (this.isLockedByOther(old?.lock)) {
					out.locked = true;
					out.data = undefined;
					return $tuple(undefined);
				}
				out.locked = false;
				const data = sanitize(old);
				out.data = data;
				return $tuple({ ...data, lock: this.newLock() });
			});
		});
		if (!ok) {
			log.warn(`Load error for ${player.Name}: ${tostring(err)}`);
			return { status: "error" };
		}
		if (out.locked || out.data === undefined) return { status: "locked" };
		return { status: "claimed", data: out.data };
	}

	private openSession(player: Player, data: PlayerData, persist: boolean): void {
		this.sessions.set(player, { data, persist });
		if (player.Parent !== Players) {
			// Left while loading: release the lock we just took.
			task.spawn(() => this.releasePlayer(player));
			return;
		}
		log.debug(`Loaded ${player.Name} (step ${data.step}, persist=${persist})`);
		this.loaded.fire(player);
	}

	private write(player: Player, release: boolean, attempts: number): boolean {
		const session = this.sessions.get(player);
		if (session === undefined) return false;
		if (!session.persist) return true;

		for (let attempt = 1; attempt <= attempts; attempt++) {
			const out = { lost: false };
			const [ok, err] = pcall(() => {
				this.store.UpdateAsync<StoredPlayerData, StoredPlayerData>(this.key(player), (old) => {
					if (this.isLockedByOther(old?.lock)) {
						out.lost = true;
						return $tuple(undefined);
					}
					out.lost = false;
					return $tuple({ ...session.data, lock: release ? undefined : this.newLock() });
				});
			});
			if (out.lost) {
				log.warn(`Session lock for ${player.Name} was taken by another server; not saving`);
				return false;
			}
			if (ok) return true;
			log.warn(`Save error for ${player.Name} (${attempt}/${attempts}): ${tostring(err)}`);
			if (attempt < attempts) task.wait(DATA.RETRY_DELAY_SECONDS);
		}
		return false;
	}

	private releasePlayer(player: Player): void {
		if (this.releasing.has(player) || !this.sessions.has(player)) return;
		this.releasing.add(player);
		this.write(player, true, DATA.SAVE_ATTEMPTS);
		this.sessions.delete(player);
		this.releasing.delete(player);
	}

	private autosave(dt: number): void {
		this.autosaveElapsed += dt;
		if (this.autosaveElapsed < DATA.AUTOSAVE_INTERVAL_SECONDS) return;
		this.autosaveElapsed = 0;
		for (const player of Players.GetPlayers()) {
			if (this.sessions.has(player) && !this.releasing.has(player)) {
				task.spawn(() => this.write(player, false, 1));
			}
		}
	}

	private onShutdown(): void {
		const players: Player[] = [];
		for (const [player] of this.sessions) players.push(player);
		for (const player of players) task.spawn(() => this.releasePlayer(player));

		const deadline = os.clock() + DATA.SHUTDOWN_MAX_WAIT_SECONDS;
		while (this.sessions.size() > 0 && os.clock() < deadline) task.wait(0.1);
	}
}
