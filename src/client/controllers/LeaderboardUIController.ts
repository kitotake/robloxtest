import { LeaderboardBoardConfig, LeaderboardConfig } from "shared/config/LeaderboardConfig";
import { getRemoteFunction, RemoteNames } from "shared/remotes";
import { LeaderboardBoard, LeaderboardId } from "shared/types/LeaderboardTypes";
import { formatLeaderboardValue } from "shared/util/FormatUtil";
import { closeMenusExcept, createHudButton, getHudGui, getSideBar } from "../ui/Hud";
import { addCorner, addStroke } from "../ui/UIHelpers";

const ROW_HEIGHT = 34;
const TAB_ACTIVE = Color3.fromRGB(70, 110, 200);
const TAB_INACTIVE = Color3.fromRGB(30, 34, 52);

interface CachedBoard {
	board: LeaderboardBoard;
	fetchedAt: number;
}

/**
 * Leaderboard menu: one tab per configured board. It only ever asks the server
 * for a board and displays the answer; a board fetched recently is reused so
 * opening/closing the menu or switching tabs never spams the server.
 */
export class LeaderboardUIController {
	private menu!: Frame;
	private list!: ScrollingFrame;
	private statusLabel!: TextLabel;
	private footerLabel!: TextLabel;
	private readonly tabs = new Map<LeaderboardId, TextButton>();
	private readonly cache = new Map<LeaderboardId, CachedBoard>();
	private selected: LeaderboardId = LeaderboardConfig.BOARDS[0].id;
	private fetching = false;

	start(): void {
		this.buildUi();
		this.select(this.selected);
	}

	private getBoardConfig(id: LeaderboardId): LeaderboardBoardConfig {
		return LeaderboardConfig.BOARDS.find((board) => board.id === id) ?? LeaderboardConfig.BOARDS[0];
	}

	private buildUi(): void {
		const openButton = createHudButton(getSideBar(), "🏆 Top", new UDim2(0, 104, 0, 40));
		openButton.LayoutOrder = 4;
		openButton.TextSize = 14;
		openButton.Activated.Connect(() => this.toggle());

		this.menu = new Instance("Frame");
		this.menu.Name = "LeaderboardMenu";
		this.menu.Visible = false;
		this.menu.AnchorPoint = new Vector2(0.5, 0.5);
		this.menu.Position = new UDim2(0.5, 0, 0.5, 0);
		this.menu.Size = new UDim2(0.8, 0, 0.85, 0);
		this.menu.BackgroundColor3 = Color3.fromRGB(22, 24, 38);
		this.menu.ZIndex = 10;
		this.menu.Parent = getHudGui();
		addCorner(this.menu, new UDim(0, 14));
		addStroke(this.menu, Color3.fromRGB(255, 200, 40), 2);

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
		title.Text = "LEADERBOARDS";
		title.ZIndex = 11;
		title.Parent = this.menu;

		const close = createHudButton(this.menu, "X", new UDim2(0, 36, 0, 36));
		close.Position = new UDim2(1, -44, 0, 6);
		close.ZIndex = 11;
		close.Activated.Connect(() => {
			this.menu.Visible = false;
		});

		this.buildTabs();

		this.list = new Instance("ScrollingFrame");
		this.list.Position = new UDim2(0, 12, 0, 100);
		this.list.Size = new UDim2(1, -24, 1, -146);
		this.list.BackgroundTransparency = 1;
		this.list.BorderSizePixel = 0;
		this.list.ScrollBarThickness = 4;
		this.list.CanvasSize = new UDim2(0, 0, 0, 0);
		this.list.AutomaticCanvasSize = Enum.AutomaticSize.Y;
		this.list.ZIndex = 11;
		this.list.Parent = this.menu;

		const layout = new Instance("UIListLayout");
		layout.Padding = new UDim(0, 4);
		layout.SortOrder = Enum.SortOrder.LayoutOrder;
		layout.Parent = this.list;

		this.statusLabel = new Instance("TextLabel");
		this.statusLabel.Position = new UDim2(0, 12, 0, 110);
		this.statusLabel.Size = new UDim2(1, -24, 0, 40);
		this.statusLabel.BackgroundTransparency = 1;
		this.statusLabel.Font = Enum.Font.GothamBold;
		this.statusLabel.TextSize = 15;
		this.statusLabel.TextColor3 = Color3.fromRGB(180, 180, 200);
		this.statusLabel.ZIndex = 12;
		this.statusLabel.Parent = this.menu;

		this.footerLabel = new Instance("TextLabel");
		this.footerLabel.AnchorPoint = new Vector2(0, 1);
		this.footerLabel.Position = new UDim2(0, 12, 1, -6);
		this.footerLabel.Size = new UDim2(1, -24, 0, 34);
		this.footerLabel.BackgroundTransparency = 1;
		this.footerLabel.Font = Enum.Font.GothamBold;
		this.footerLabel.TextSize = 15;
		this.footerLabel.TextColor3 = Color3.fromRGB(255, 200, 40);
		this.footerLabel.ZIndex = 12;
		this.footerLabel.Parent = this.menu;
	}

	private buildTabs(): void {
		const row = new Instance("Frame");
		row.Position = new UDim2(0, 12, 0, 50);
		row.Size = new UDim2(1, -24, 0, 40);
		row.BackgroundTransparency = 1;
		row.ZIndex = 11;
		row.Parent = this.menu;

		const layout = new Instance("UIListLayout");
		layout.FillDirection = Enum.FillDirection.Horizontal;
		layout.Padding = new UDim(0, 6);
		layout.SortOrder = Enum.SortOrder.LayoutOrder;
		layout.Parent = row;

		const count = LeaderboardConfig.BOARDS.size();
		LeaderboardConfig.BOARDS.forEach((board, index) => {
			const tab = createHudButton(row, `${board.icon} ${board.title}`, new UDim2(1 / count, -6, 1, 0));
			tab.LayoutOrder = index;
			tab.TextSize = 12;
			tab.TextWrapped = true;
			tab.ZIndex = 12;
			tab.Activated.Connect(() => this.select(board.id));
			this.tabs.set(board.id, tab);
		});
	}

	private toggle(): void {
		this.menu.Visible = !this.menu.Visible;
		if (!this.menu.Visible) return;
		closeMenusExcept("LeaderboardMenu");
		this.select(this.selected);
	}

	private select(id: LeaderboardId): void {
		this.selected = id;
		for (const [tabId, tab] of this.tabs) tab.BackgroundColor3 = tabId === id ? TAB_ACTIVE : TAB_INACTIVE;

		const cached = this.cache.get(id);
		if (cached !== undefined) this.render(cached.board);
		else this.renderLoading();

		const stale = cached === undefined || os.clock() - cached.fetchedAt >= LeaderboardConfig.CLIENT_CACHE_SECONDS;
		if (stale && this.menu.Visible) this.fetch(id);
	}

	private fetch(id: LeaderboardId): void {
		if (this.fetching) return;
		this.fetching = true;
		task.spawn(() => {
			const [ok, result] = pcall(() => getRemoteFunction(RemoteNames.GetLeaderboard).InvokeServer(id) as unknown);
			this.fetching = false;
			if (!ok || !typeIs(result, "table")) return;

			const board = result as LeaderboardBoard;
			this.cache.set(id, { board, fetchedAt: os.clock() });
			if (this.selected === id) this.render(board);
		});
	}

	private clearRows(): void {
		for (const child of this.list.GetChildren()) {
			if (child.IsA("Frame")) child.Destroy();
		}
	}

	private renderLoading(): void {
		this.clearRows();
		this.statusLabel.Text = "Loading...";
		this.statusLabel.Visible = true;
		this.footerLabel.Text = "";
	}

	private render(board: LeaderboardBoard): void {
		const config = this.getBoardConfig(board.id);
		this.clearRows();

		this.statusLabel.Visible = board.entries.size() === 0;
		this.statusLabel.Text = board.updatedAt === 0 ? "No ranking yet. Be the first!" : "Nobody is ranked yet.";

		board.entries.forEach((entry) => {
			const row = new Instance("Frame");
			row.LayoutOrder = entry.rank;
			row.Size = new UDim2(1, -8, 0, ROW_HEIGHT);
			row.BackgroundColor3 = entry.isSelf ? Color3.fromRGB(255, 200, 40) : Color3.fromRGB(34, 38, 58);
			row.BackgroundTransparency = entry.isSelf ? 0.7 : 0.2;
			row.ZIndex = 12;
			row.Parent = this.list;
			addCorner(row, new UDim(0, 8));

			const name = new Instance("TextLabel");
			name.Size = new UDim2(0.58, 0, 1, 0);
			name.Position = new UDim2(0, 10, 0, 0);
			name.BackgroundTransparency = 1;
			name.Font = Enum.Font.GothamBold;
			name.TextSize = 14;
			name.TextXAlignment = Enum.TextXAlignment.Left;
			name.TextTruncate = Enum.TextTruncate.AtEnd;
			name.TextColor3 = new Color3(1, 1, 1);
			name.Text = `#${entry.rank}  ${entry.name}`;
			name.ZIndex = 13;
			name.Parent = row;

			const value = new Instance("TextLabel");
			value.Size = new UDim2(0.4, -10, 1, 0);
			value.Position = new UDim2(0.6, 0, 0, 0);
			value.BackgroundTransparency = 1;
			value.Font = Enum.Font.GothamBold;
			value.TextSize = 14;
			value.TextXAlignment = Enum.TextXAlignment.Right;
			value.TextColor3 = Color3.fromRGB(255, 200, 40);
			value.Text = formatLeaderboardValue(config.format, entry.value);
			value.ZIndex = 13;
			value.Parent = row;
		});

		const own = formatLeaderboardValue(config.format, board.ownValue);
		this.footerLabel.Text = board.ownRank > 0 ? `You: ${own}  (rank #${board.ownRank})` : `You: ${own}`;
	}
}
