import { Players } from "@rbxts/services";
import { CheckpointConfig } from "shared/config/CheckpointConfig";
import { GameConfig } from "shared/config/GameConfig";
import { getRemoteEvent, RemoteNames } from "shared/remotes";
import { CheckpointAction } from "shared/types/CheckpointTypes";
import { CheckpointStore } from "../stores/CheckpointStore";
import { ProgressStore } from "../stores/ProgressStore";
import { closeMenusExcept, createHudButton, getHudGui, getSideBar } from "../ui/Hud";
import { addCorner, addStroke } from "../ui/UIHelpers";

const { MAX_STEP } = GameConfig;
const { RECOVERY, SAVE_PRODUCT } = CheckpointConfig;

/**
 * Checkpoint menu. It clearly separates CURRENT PROGRESS (this session) from
 * SAVED CHECKPOINT (persistent). Buttons only send an action name; the server
 * validates, charges and applies everything.
 */
export class CheckpointUIController {
	private readonly localUserId = Players.LocalPlayer.UserId;
	private menu!: Frame;
	private currentLabel!: TextLabel;
	private savedLabel!: TextLabel;
	private saveCreditButton!: TextButton;
	private videosButton!: TextButton;
	private buySaveButton!: TextButton;
	private recoverButton!: TextButton;
	private buyRecoveryButton!: TextButton;

	constructor(
		private readonly progress: ProgressStore,
		private readonly checkpoint: CheckpointStore,
	) {}

	start(): void {
		this.buildUi();
		this.checkpoint.changed.connect(() => this.refresh());
		this.progress.changed.connect((userId) => {
			if (userId === this.localUserId) this.refresh();
		});
		this.refresh();
	}

	private buildUi(): void {
		const request = getRemoteEvent(RemoteNames.CheckpointAction);
		const send = (action: CheckpointAction) => request.FireServer(action);

		const openButton = createHudButton(getSideBar(), "💾 Checkpoint", new UDim2(0, 104, 0, 40));
		openButton.LayoutOrder = 3;
		openButton.TextSize = 14;
		openButton.Activated.Connect(() => {
			this.menu.Visible = !this.menu.Visible;
			if (this.menu.Visible) closeMenusExcept("CheckpointMenu");
		});

		this.menu = new Instance("Frame");
		this.menu.Name = "CheckpointMenu";
		this.menu.Visible = false;
		this.menu.AnchorPoint = new Vector2(0.5, 0.5);
		this.menu.Position = new UDim2(0.5, 0, 0.5, 0);
		this.menu.Size = new UDim2(0.8, 0, 0.85, 0);
		this.menu.BackgroundColor3 = Color3.fromRGB(22, 24, 38);
		this.menu.ZIndex = 10;
		this.menu.Parent = getHudGui();
		addCorner(this.menu, new UDim(0, 14));
		addStroke(this.menu, Color3.fromRGB(90, 170, 255), 2);

		const limit = new Instance("UISizeConstraint");
		limit.MaxSize = new Vector2(360, 460);
		limit.Parent = this.menu;

		const title = new Instance("TextLabel");
		title.Size = new UDim2(1, -56, 0, 44);
		title.Position = new UDim2(0, 16, 0, 4);
		title.BackgroundTransparency = 1;
		title.Font = Enum.Font.GothamBold;
		title.TextSize = 20;
		title.TextXAlignment = Enum.TextXAlignment.Left;
		title.TextColor3 = new Color3(1, 1, 1);
		title.Text = "💾 CHECKPOINT";
		title.ZIndex = 11;
		title.Parent = this.menu;

		const close = createHudButton(this.menu, "X", new UDim2(0, 36, 0, 36));
		close.Position = new UDim2(1, -44, 0, 8);
		close.ZIndex = 11;
		close.Activated.Connect(() => {
			this.menu.Visible = false;
		});

		const list = new Instance("ScrollingFrame");
		list.Position = new UDim2(0, 12, 0, 56);
		list.Size = new UDim2(1, -24, 1, -68);
		list.BackgroundTransparency = 1;
		list.BorderSizePixel = 0;
		list.ScrollBarThickness = 4;
		list.CanvasSize = new UDim2(0, 0, 0, 0);
		list.AutomaticCanvasSize = Enum.AutomaticSize.Y;
		list.ZIndex = 11;
		list.Parent = this.menu;

		const layout = new Instance("UIListLayout");
		layout.Padding = new UDim(0, 8);
		layout.SortOrder = Enum.SortOrder.LayoutOrder;
		layout.Parent = list;

		this.currentLabel = this.createLabel(list, 1, Color3.fromRGB(255, 255, 255));
		this.savedLabel = this.createLabel(list, 2, Color3.fromRGB(90, 170, 255));

		this.createLabel(list, 3, Color3.fromRGB(180, 180, 200)).Text = "SAVE A CHECKPOINT AT YOUR CURRENT PROGRESS";
		this.saveCreditButton = this.createButton(list, 4, () => send("Save"));
		this.videosButton = this.createButton(list, 5, () => send("WatchVideo"));
		this.buySaveButton = this.createButton(list, 6, () => send("BuySave"));

		this.createLabel(list, 7, Color3.fromRGB(180, 180, 200)).Text = "RECOVER YOUR SAVED CHECKPOINT";
		this.recoverButton = this.createButton(list, 8, () => send("Recover"));
		this.buyRecoveryButton = this.createButton(list, 9, () => send("BuyRecovery"));
	}

	private createLabel(parent: Instance, order: number, color: Color3): TextLabel {
		const label = new Instance("TextLabel");
		label.LayoutOrder = order;
		label.Size = new UDim2(1, -8, 0, 46);
		label.BackgroundTransparency = 1;
		label.Font = Enum.Font.GothamBold;
		label.TextSize = 15;
		label.TextWrapped = true;
		label.TextColor3 = color;
		label.ZIndex = 12;
		label.Parent = parent;
		return label;
	}

	private createButton(parent: Instance, order: number, onClick: () => void): TextButton {
		const button = createHudButton(parent, "", new UDim2(1, -8, 0, 46));
		button.LayoutOrder = order;
		button.TextSize = 14;
		button.TextWrapped = true;
		button.ZIndex = 12;
		button.Activated.Connect(onClick);
		return button;
	}

	private priceSuffix(priceRobux: number): string {
		return priceRobux > 0 ? ` (${priceRobux} R$)` : "";
	}

	private refresh(): void {
		const info = this.checkpoint.get();
		const current = this.progress.get(this.localUserId) ?? 0;

		this.currentLabel.Text = `CURRENT PROGRESS\n${current} / ${MAX_STEP}`;
		this.savedLabel.Text = `SAVED CHECKPOINT\n${info.saved > 0 ? `${info.saved} / ${MAX_STEP}` : "none"}`;

		this.saveCreditButton.Visible = info.saveCredits > 0;
		this.saveCreditButton.Text = `Save now (use 1 of ${info.saveCredits} credit${info.saveCredits === 1 ? "" : "s"})`;

		this.videosButton.Visible = info.videosRequired > 0;
		this.videosButton.Text = info.videosAvailable
			? `Watch ${info.videosRequired} video${info.videosRequired === 1 ? "" : "s"} (${info.videosWatched}/${info.videosRequired})`
			: `Videos not available yet (${info.videosRequired} needed)`;

		this.buySaveButton.Text = `Buy with Robux${this.priceSuffix(SAVE_PRODUCT.priceRobux)}`;

		const hasSaved = info.saved > 0;
		this.recoverButton.Visible = hasSaved;
		if (info.recoveryCredits > 0) {
			this.recoverButton.Text = `Recover to ${info.saved} (use a recovery credit)`;
		} else if (RECOVERY.ALLOW_RUBIES) {
			const cost = RECOVERY.RUBY_COST;
			this.recoverButton.Text = `Recover to ${info.saved} (${cost > 0 ? `💎 ${cost}` : "free"})`;
		} else {
			this.recoverButton.Text = `Recover to ${info.saved} (use the Robux option)`;
		}

		this.buyRecoveryButton.Visible = hasSaved && RECOVERY.ALLOW_ROBUX;
		this.buyRecoveryButton.Text = `Recover with Robux${this.priceSuffix(RECOVERY.ROBUX_PRODUCT.priceRobux)}`;
	}
}
