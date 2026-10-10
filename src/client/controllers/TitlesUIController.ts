import { TITLES } from "shared/config/TitleConfig";
import { getRemoteEvent, RemoteNames } from "shared/remotes";
import { describeRequirement } from "shared/util/TitleUtil";
import { TitleStore } from "../stores/TitleStore";
import { closeMenusExcept, createHudButton, getHudGui, getSideBar } from "../ui/Hud";
import { addCorner, addStroke } from "../ui/UIHelpers";

const ROW_HEIGHT = 58;

/**
 * Titles menu: every title with how to get it. A title the player owns can be
 * equipped; the button only sends the title id, the server checks ownership.
 */
export class TitlesUIController {
	private menu!: Frame;
	private list!: ScrollingFrame;

	constructor(private readonly store: TitleStore) {}

	start(): void {
		const openButton = createHudButton(getSideBar(), "🏷️ Titles", new UDim2(0, 104, 0, 40));
		openButton.LayoutOrder = 5;
		openButton.TextSize = 14;
		openButton.Activated.Connect(() => {
			this.menu.Visible = !this.menu.Visible;
			if (this.menu.Visible) closeMenusExcept("TitlesMenu");
		});

		this.menu = new Instance("Frame");
		this.menu.Name = "TitlesMenu";
		this.menu.Visible = false;
		this.menu.AnchorPoint = new Vector2(0.5, 0.5);
		this.menu.Position = new UDim2(0.5, 0, 0.5, 0);
		this.menu.Size = new UDim2(0.8, 0, 0.85, 0);
		this.menu.BackgroundColor3 = Color3.fromRGB(22, 24, 38);
		this.menu.ZIndex = 10;
		this.menu.Parent = getHudGui();
		addCorner(this.menu, new UDim(0, 14));
		addStroke(this.menu, Color3.fromRGB(0, 240, 255), 2);

		const limit = new Instance("UISizeConstraint");
		limit.MaxSize = new Vector2(400, 500);
		limit.Parent = this.menu;

		const title = new Instance("TextLabel");
		title.Size = new UDim2(1, -56, 0, 40);
		title.Position = new UDim2(0, 16, 0, 4);
		title.BackgroundTransparency = 1;
		title.Font = Enum.Font.GothamBold;
		title.TextSize = 20;
		title.TextXAlignment = Enum.TextXAlignment.Left;
		title.TextColor3 = new Color3(1, 1, 1);
		title.Text = "🏷️ TITLES";
		title.ZIndex = 11;
		title.Parent = this.menu;

		const close = createHudButton(this.menu, "X", new UDim2(0, 36, 0, 36));
		close.Position = new UDim2(1, -44, 0, 6);
		close.ZIndex = 11;
		close.Activated.Connect(() => {
			this.menu.Visible = false;
		});

		this.list = new Instance("ScrollingFrame");
		this.list.Position = new UDim2(0, 12, 0, 52);
		this.list.Size = new UDim2(1, -24, 1, -64);
		this.list.BackgroundTransparency = 1;
		this.list.BorderSizePixel = 0;
		this.list.ScrollBarThickness = 4;
		this.list.CanvasSize = new UDim2(0, 0, 0, 0);
		this.list.AutomaticCanvasSize = Enum.AutomaticSize.Y;
		this.list.ZIndex = 11;
		this.list.Parent = this.menu;

		const layout = new Instance("UIListLayout");
		layout.Padding = new UDim(0, 6);
		layout.SortOrder = Enum.SortOrder.LayoutOrder;
		layout.Parent = this.list;

		this.store.changed.connect(() => this.render());
		this.render();
	}

	private render(): void {
		for (const child of this.list.GetChildren()) {
			if (child.IsA("Frame")) child.Destroy();
		}

		const info = this.store.get();
		const request = getRemoteEvent(RemoteNames.EquipTitle);
		const sorted = [...TITLES].sort((a, b) => a.priority > b.priority); // most prestigious first

		sorted.forEach((definition, index) => {
			const owned = info.unlocked.includes(definition.id);
			const equipped = info.equipped === definition.id;

			const row = new Instance("Frame");
			row.LayoutOrder = index;
			row.Size = new UDim2(1, -8, 0, ROW_HEIGHT);
			row.BackgroundColor3 = Color3.fromRGB(34, 38, 58);
			row.BackgroundTransparency = owned ? 0.1 : 0.5;
			row.ZIndex = 12;
			row.Parent = this.list;
			addCorner(row, new UDim(0, 8));
			if (equipped) addStroke(row, definition.color, 2);

			const name = new Instance("TextLabel");
			name.Position = new UDim2(0, 10, 0, 4);
			name.Size = new UDim2(1, -110, 0, 24);
			name.BackgroundTransparency = 1;
			name.Font = Enum.Font.GothamBold;
			name.TextSize = 16;
			name.TextXAlignment = Enum.TextXAlignment.Left;
			name.TextColor3 = owned ? definition.color : Color3.fromRGB(130, 130, 150);
			name.Text = `[${definition.displayName}]`;
			name.ZIndex = 13;
			name.Parent = row;

			const description = new Instance("TextLabel");
			description.Position = new UDim2(0, 10, 0, 28);
			description.Size = new UDim2(1, -110, 0, 26);
			description.BackgroundTransparency = 1;
			description.Font = Enum.Font.Gotham;
			description.TextSize = 12;
			description.TextWrapped = true;
			description.TextXAlignment = Enum.TextXAlignment.Left;
			description.TextYAlignment = Enum.TextYAlignment.Top;
			description.TextColor3 = Color3.fromRGB(180, 180, 200);
			description.Text = describeRequirement(definition);
			description.ZIndex = 13;
			description.Parent = row;

			const button = createHudButton(
				row,
				equipped ? "Equipped" : owned ? "Equip" : "🔒",
				new UDim2(0, 88, 0, 34),
			);
			button.AnchorPoint = new Vector2(1, 0.5);
			button.Position = new UDim2(1, -8, 0.5, 0);
			button.TextSize = 13;
			button.ZIndex = 13;
			button.Active = owned && !equipped;
			if (owned && !equipped) button.Activated.Connect(() => request.FireServer(definition.id));
		});
	}
}
