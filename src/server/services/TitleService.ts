import { Players } from "@rbxts/services";
import { TITLES, TitleConfig } from "shared/config/TitleConfig";
import { getRemoteEvent, getRemoteFunction, RemoteNames } from "shared/remotes";
import { PlayerData } from "shared/types/PlayerData";
import { TitleInfo } from "shared/types/TitleTypes";
import { createLogger } from "shared/util/Logger";
import { Signal } from "shared/util/Signal";
import { getTitle, meetsRequirement, pickBestTitle, TitleStats } from "shared/util/TitleUtil";
import { DataService } from "./DataService";
import { NoticeService } from "./NoticeService";
import { PlayTimeService } from "./PlayTimeService";
import { SupportService } from "./SupportService";
import { VictoryService } from "./VictoryService";

const log = createLogger("TitleService");
const NAMEPLATE_NAME = "Nameplate";

/**
 * Milestone titles. Titles are data (TitleConfig); ownership lives in the
 * persistent PlayerData (`unlockedTitles`, `equippedTitle`). A title is
 * unlocked from the player's existing stats (victories, support, play time)
 * or granted by code for "Special" titles such as NO-SKIP. The equipped title
 * is shown above the head in a server-created BillboardGui.
 */
export class TitleService {
	/** (player, titleId) — fired once per title, when it is unlocked. */
	readonly titleUnlocked = new Signal<[player: Player, titleId: string]>();

	private readonly titlesChanged = getRemoteEvent(RemoteNames.TitlesChanged);
	private readonly titlesRequest = getRemoteFunction(RemoteNames.GetTitles);
	private readonly equipRemote = getRemoteEvent(RemoteNames.EquipTitle);
	private readonly lastEquip = new Map<Player, number>();

	constructor(
		private readonly data: DataService,
		private readonly playTime: PlayTimeService,
		private readonly notices: NoticeService,
		private readonly victories: VictoryService,
		private readonly support: SupportService,
	) {}

	start(): void {
		this.titlesRequest.OnServerInvoke = (player) => this.getInfo(player);
		this.equipRemote.OnServerEvent.Connect((player, titleId: unknown) => this.onEquip(player, titleId));

		// Evaluated when stats change, never in a loop: on load, after a victory or a purchase,
		// and right before each save (which also catches play-time milestones, at most a minute late).
		this.data.loaded.connect((player) => this.onLoaded(player));
		this.victories.victoryRecorded.connect((player) => this.evaluate(player, true, true, false));
		this.support.changed.connect((player) => this.evaluate(player, true, true, false));
		this.data.beforeSave.connect((player) => this.evaluate(player, true, false, false));
		this.data.released.connect((player) => this.lastEquip.delete(player));

		Players.PlayerAdded.Connect((player) => this.hookCharacter(player));
		for (const player of Players.GetPlayers()) this.hookCharacter(player);
	}

	getInfo(player: Player): TitleInfo | undefined {
		const saved = this.data.getData(player);
		if (saved === undefined) return undefined;
		const unlocked: string[] = [];
		for (const id of saved.unlockedTitles) unlocked.push(id);
		return { unlocked, equipped: saved.equippedTitle };
	}

	/**
	 * Grants a "Special" title (e.g. NO-SKIP). Returns true if it was newly unlocked,
	 * false if the player already had it or the id is not a Special title.
	 */
	grantSpecial(player: Player, titleId: string): boolean {
		const saved = this.data.getData(player);
		const title = getTitle(titleId);
		if (saved === undefined || title === undefined || title.requirement.type !== "Special") return false;
		if (saved.unlockedTitles.includes(titleId)) return false;

		saved.unlockedTitles.push(titleId);
		this.afterUnlock(player, saved, [titleId], true, true, false);
		return true;
	}

	// ---------------------------------------------------------------- evaluation

	private onLoaded(player: Player): void {
		this.evaluate(player, false, false, true);
		this.scheduleNameplate(player);
	}

	/**
	 * Unlocks every title whose requirement is now met. `save` writes the data
	 * right away (not allowed from inside a save, hence false for beforeSave).
	 */
	private evaluate(player: Player, notify: boolean, save: boolean, force: boolean): void {
		const saved = this.data.getData(player);
		if (saved === undefined) return;

		const stats: TitleStats = {
			victories: saved.victories,
			support: saved.supportRobuxTotal,
			playTime: this.playTime.getTotal(player),
		};
		const unlocked: string[] = [];
		for (const title of TITLES) {
			if (saved.unlockedTitles.includes(title.id) || !meetsRequirement(title.requirement, stats)) continue;
			saved.unlockedTitles.push(title.id);
			unlocked.push(title.id);
		}
		if (unlocked.size() > 0 || force) this.afterUnlock(player, saved, unlocked, notify, save, force);
	}

	private afterUnlock(
		player: Player,
		saved: PlayerData,
		unlocked: string[],
		notify: boolean,
		save: boolean,
		force: boolean,
	): void {
		for (const id of unlocked) {
			log.debug(`${player.Name} unlocked title ${id}`);
			this.titleUnlocked.fire(player, id);
			if (notify) this.notices.send(player, "info", `New title unlocked: [${getTitle(id)?.displayName ?? id}]`);
		}

		const previous = saved.equippedTitle;
		this.updateEquipped(saved, unlocked);
		if (saved.equippedTitle !== previous || unlocked.size() > 0 || force) {
			this.refreshNameplate(player);
			this.publish(player);
		}
		if (save && unlocked.size() > 0) task.spawn(() => this.data.saveNow(player));
	}

	/** Keeps `equippedTitle` valid, and moves it to a newly unlocked, more prestigious title. */
	private updateEquipped(saved: PlayerData, newlyUnlocked: string[]): void {
		let equipped = saved.equippedTitle;
		if (!saved.unlockedTitles.includes(equipped) || getTitle(equipped) === undefined) {
			equipped = pickBestTitle(saved.unlockedTitles) ?? TitleConfig.DEFAULT_TITLE_ID;
		}
		if (TitleConfig.AUTO_EQUIP_HIGHER_PRIORITY && newlyUnlocked.size() > 0) {
			const best = pickBestTitle(newlyUnlocked);
			const bestPriority = best !== undefined ? (getTitle(best)?.priority ?? -1) : -1;
			if (best !== undefined && bestPriority > (getTitle(equipped)?.priority ?? -1)) equipped = best;
		}
		saved.equippedTitle = equipped;
	}

	// -------------------------------------------------------------------- equip

	private onEquip(player: Player, titleId: unknown): void {
		if (!typeIs(titleId, "string")) return;
		const saved = this.data.getData(player);
		if (saved === undefined) return;

		const now = os.clock();
		const last = this.lastEquip.get(player);
		if (last !== undefined && now - last < TitleConfig.EQUIP_COOLDOWN_SECONDS) return;
		this.lastEquip.set(player, now);

		// Only a title the server says the player owns can be equipped.
		if (!saved.unlockedTitles.includes(titleId) || getTitle(titleId) === undefined) return;
		saved.equippedTitle = titleId;
		this.refreshNameplate(player);
		this.publish(player);
	}

	private publish(player: Player): void {
		const info = this.getInfo(player);
		if (info !== undefined) this.titlesChanged.FireClient(player, info);
	}

	// ----------------------------------------------------------------- nameplate

	private hookCharacter(player: Player): void {
		player.CharacterAdded.Connect(() => this.scheduleNameplate(player));
		if (player.Character !== undefined) this.scheduleNameplate(player);
	}

	/** A character can be announced while still assembling: wait for its Head before drawing the plate. */
	private scheduleNameplate(player: Player): void {
		task.spawn(() => {
			player.Character?.WaitForChild("Head", 10);
			this.refreshNameplate(player);
		});
	}

	/** Title above the player's name, above the head. Replaces Roblox's default name tag. */
	private refreshNameplate(player: Player): void {
		if (!TitleConfig.NAMEPLATE.ENABLED) return;
		const saved = this.data.getData(player);
		const character = player.Character;
		const head = character?.FindFirstChild("Head") as BasePart | undefined;
		if (saved === undefined || character === undefined || head === undefined) return;

		const gui = (head.FindFirstChild(NAMEPLATE_NAME) as BillboardGui | undefined) ?? this.createNameplate(head);
		const title = getTitle(saved.equippedTitle);
		const titleLabel = gui.FindFirstChild("Title") as TextLabel;
		titleLabel.Text = title !== undefined ? `[${title.displayName}]` : "";
		titleLabel.TextColor3 = title?.color ?? new Color3(1, 1, 1);
		(gui.FindFirstChild("PlayerName") as TextLabel).Text = player.DisplayName;

		const humanoid = character.FindFirstChildOfClass("Humanoid");
		if (humanoid !== undefined) humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None;
	}

	private createNameplate(head: BasePart): BillboardGui {
		const gui = new Instance("BillboardGui");
		gui.Name = NAMEPLATE_NAME;
		gui.Adornee = head;
		gui.Size = new UDim2(0, 240, 0, 52);
		gui.StudsOffset = new Vector3(0, TitleConfig.NAMEPLATE.HEIGHT_OFFSET, 0);
		gui.MaxDistance = TitleConfig.NAMEPLATE.MAX_DISTANCE;
		gui.AlwaysOnTop = false;
		gui.LightInfluence = 0;

		const titleLabel = new Instance("TextLabel");
		titleLabel.Name = "Title";
		titleLabel.Size = new UDim2(1, 0, 0.55, 0);
		titleLabel.BackgroundTransparency = 1;
		titleLabel.Font = Enum.Font.GothamBold;
		titleLabel.TextSize = 20;
		titleLabel.TextStrokeTransparency = 0.4;
		titleLabel.Parent = gui;

		const nameLabel = new Instance("TextLabel");
		nameLabel.Name = "PlayerName";
		nameLabel.Position = new UDim2(0, 0, 0.55, 0);
		nameLabel.Size = new UDim2(1, 0, 0.45, 0);
		nameLabel.BackgroundTransparency = 1;
		nameLabel.Font = Enum.Font.Gotham;
		nameLabel.TextSize = 16;
		nameLabel.TextColor3 = new Color3(1, 1, 1);
		nameLabel.TextStrokeTransparency = 0.5;
		nameLabel.Parent = gui;

		gui.Parent = head;
		return gui;
	}
}
