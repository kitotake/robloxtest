import { DataStoreService, Players, RunService } from "@rbxts/services";
import { LeaderboardConfig } from "shared/config/LeaderboardConfig";
import { getRemoteFunction, RemoteNames } from "shared/remotes";
import { LeaderboardBoard, LeaderboardEntry, LeaderboardId } from "shared/types/LeaderboardTypes";
import { PlayerData } from "shared/types/PlayerData";
import { mergeRanking, RankingEntry, shouldPublish } from "shared/util/LeaderboardUtil";
import { createLogger } from "shared/util/Logger";
import { DataService } from "./DataService";
import { PlayTimeService } from "./PlayTimeService";

const log = createLogger("LeaderboardService");
const CONFIG = LeaderboardConfig;

/** One ranked category. Adding a category = a config entry plus one definition here. */
interface StatDefinition {
	id: LeaderboardId;
	store: OrderedDataStore;
	/** Live value of a loaded player. */
	getValue: (player: Player, saved: PlayerData) => number;
	getPublished: (saved: PlayerData) => number;
	setPublished: (saved: PlayerData, value: number) => void;
	minDelta: (leaving: boolean) => number;
}

/**
 * Global leaderboards on OrderedDataStores. Values come only from the server's
 * own player data; clients can only ask for a board. Writes are throttled
 * (a value is written only when it changed enough since its last publish,
 * checked once a minute and when the player leaves), reads are cached.
 */
export class LeaderboardService {
	private readonly definitions: StatDefinition[];
	private readonly cache = new Map<LeaderboardId, RankingEntry[]>();
	private readonly updatedAt = new Map<LeaderboardId, number>();
	private readonly names = new Map<number, string>();
	private readonly lastRequest = new Map<Player, number>();
	private readonly boardRequest = getRemoteFunction(RemoteNames.GetLeaderboard);
	private publishElapsed = 0;
	private refreshElapsed = 0;
	private publishing = false;
	private refreshing = false;

	constructor(
		private readonly data: DataService,
		private readonly playTime: PlayTimeService,
	) {
		const store = (id: LeaderboardId) => DataStoreService.GetOrderedDataStore(CONFIG.STORES[id]);
		this.definitions = [
			{
				id: "Victories",
				store: store("Victories"),
				getValue: (_player, saved) => saved.victories,
				getPublished: (saved) => saved.publishedVictories,
				setPublished: (saved, value) => (saved.publishedVictories = value),
				minDelta: () => 1,
			},
			{
				id: "Support",
				store: store("Support"),
				getValue: (_player, saved) => saved.supportRobuxTotal,
				getPublished: (saved) => saved.publishedSupport,
				setPublished: (saved, value) => (saved.publishedSupport = value),
				minDelta: () => 1,
			},
			{
				id: "PlayTime",
				store: store("PlayTime"),
				getValue: (player) => this.playTime.getTotal(player),
				getPublished: (saved) => saved.publishedPlayTime,
				setPublished: (saved, value) => (saved.publishedPlayTime = value),
				minDelta: (leaving) =>
					leaving
						? CONFIG.PLAYTIME_MIN_PUBLISH_DELTA_ON_LEAVE_SECONDS
						: CONFIG.PLAYTIME_MIN_PUBLISH_DELTA_SECONDS,
			},
		];
	}

	start(): void {
		this.boardRequest.OnServerInvoke = (player, boardId: unknown) => this.onRequest(player, boardId);
		// Connected before DataService's own handler, so the final publish sees the player's data.
		Players.PlayerRemoving.Connect((player) => {
			task.spawn(() => this.publishPlayer(player, true));
			this.lastRequest.delete(player);
		});
		RunService.Heartbeat.Connect((dt) => this.tick(dt));
		game.BindToClose(() => this.onShutdown());
		task.spawn(() => this.refreshAll());
	}

	// ------------------------------------------------------------------ requests

	private onRequest(player: Player, boardId: unknown): LeaderboardBoard | undefined {
		if (!typeIs(boardId, "string")) return undefined;
		const definition = this.definitions.find((candidate) => candidate.id === boardId);
		if (definition === undefined) return undefined;

		const now = os.clock();
		const last = this.lastRequest.get(player);
		if (last !== undefined && now - last < CONFIG.REQUEST_COOLDOWN_SECONDS) return undefined;
		this.lastRequest.set(player, now);

		return this.buildBoard(player, definition);
	}

	/** Cached global ranking overlaid with the live values of this server's players. */
	private buildBoard(requester: Player, definition: StatDefinition): LeaderboardBoard {
		const live: RankingEntry[] = [];
		let ownValue = 0;
		for (const player of Players.GetPlayers()) {
			const saved = this.data.getData(player);
			if (saved === undefined) continue;
			const value = math.floor(definition.getValue(player, saved));
			live.push({ userId: player.UserId, name: player.Name, value });
			if (player === requester) ownValue = value;
		}

		const ranking = mergeRanking(this.cache.get(definition.id) ?? [], live, CONFIG.TOP_COUNT);
		const entries: LeaderboardEntry[] = [];
		let ownRank = 0;
		ranking.forEach((entry, index) => {
			const isSelf = entry.userId === requester.UserId;
			if (isSelf) ownRank = index + 1;
			entries.push({ rank: index + 1, name: entry.name, value: entry.value, isSelf });
		});

		return { id: definition.id, entries, ownValue, ownRank, updatedAt: this.updatedAt.get(definition.id) ?? 0 };
	}

	// ---------------------------------------------------------------- scheduling

	private tick(dt: number): void {
		this.publishElapsed += dt;
		this.refreshElapsed += dt;

		if (this.publishElapsed >= CONFIG.PUBLISH_CHECK_INTERVAL_SECONDS) {
			this.publishElapsed = 0;
			if (!this.publishing) {
				this.publishing = true;
				task.spawn(() => {
					for (const player of Players.GetPlayers()) this.publishPlayer(player, false);
					this.publishing = false;
				});
			}
		}
		if (this.refreshElapsed >= CONFIG.GLOBAL_REFRESH_INTERVAL_SECONDS) {
			this.refreshElapsed = 0;
			task.spawn(() => this.refreshAll());
		}
	}

	// ----------------------------------------------------------------- publishing

	/**
	 * Writes the values that changed enough since their last publish. Nothing is
	 * written for an unchanged value, so a quiet player costs no request at all.
	 */
	private publishPlayer(player: Player, leaving: boolean): void {
		const saved = this.data.getData(player);
		if (saved === undefined) return;

		const key = tostring(player.UserId);
		for (const definition of this.definitions) {
			const value = math.floor(definition.getValue(player, saved));
			if (!shouldPublish(value, definition.getPublished(saved), definition.minDelta(leaving))) continue;

			const [ok, err] = pcall(() => definition.store.SetAsync(key, value));
			if (ok) definition.setPublished(saved, value);
			else log.debug(`Publish ${definition.id} for ${player.Name} failed, retrying later: ${tostring(err)}`);
		}
	}

	private onShutdown(): void {
		let pending = 0;
		for (const player of Players.GetPlayers()) {
			pending += 1;
			task.spawn(() => {
				this.publishPlayer(player, true);
				pending -= 1;
			});
		}
		const deadline = os.clock() + CONFIG.SHUTDOWN_MAX_WAIT_SECONDS;
		while (pending > 0 && os.clock() < deadline) task.wait(0.1);
	}

	// -------------------------------------------------------------------- reading

	/** Re-reads the global top lists. On failure the previous cache is kept. */
	private refreshAll(): void {
		if (this.refreshing) return;
		this.refreshing = true;

		for (const definition of this.definitions) {
			const [ok, page] = pcall(() => definition.store.GetSortedAsync(false, CONFIG.TOP_COUNT).GetCurrentPage());
			if (!ok) {
				log.debug(`Reading ${definition.id} failed, keeping the cached list: ${tostring(page)}`);
				continue;
			}

			const entries: RankingEntry[] = [];
			for (const row of page as { key: string; value: unknown }[]) {
				const userId = tonumber(row.key);
				if (userId === undefined || !typeIs(row.value, "number")) continue;
				entries.push({ userId, name: this.resolveName(userId), value: row.value });
			}
			this.cache.set(definition.id, entries);
			this.updatedAt.set(definition.id, os.time());
		}
		this.refreshing = false;
	}

	private resolveName(userId: number): string {
		const online = Players.GetPlayerByUserId(userId);
		if (online !== undefined) return online.Name;
		const cached = this.names.get(userId);
		if (cached !== undefined) return cached;

		const [ok, name] = pcall(() => Players.GetNameFromUserIdAsync(userId as unknown as User));
		if (ok && typeIs(name, "string")) {
			this.names.set(userId, name);
			return name;
		}
		return "Player";
	}
}
