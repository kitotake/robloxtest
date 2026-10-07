import { MonetizationConfig } from "shared/config/MonetizationConfig";
import { getRemoteEvent, RemoteNames } from "shared/remotes";
import { closeMenusExcept, createHudButton, getHudGui, getSideBar } from "../ui/Hud";
import { addCorner, addStroke } from "../ui/UIHelpers";

/** Donate button (side bar) and its menu. Only sends the chosen option id to the server. */
export class DonateUIController {
	private menu!: Frame;

	start(): void {
		const request = getRemoteEvent(RemoteNames.RequestPurchase);

		const donateButton = createHudButton(getSideBar(), "⭐ Donate", new UDim2(0, 104, 0, 40));
		donateButton.LayoutOrder = 2;
		donateButton.Activated.Connect(() => {
			this.menu.Visible = !this.menu.Visible;
			if (this.menu.Visible) closeMenusExcept("DonateMenu");
		});

		this.menu = new Instance("Frame");
		this.menu.Name = "DonateMenu";
		this.menu.Visible = false;
		this.menu.AnchorPoint = new Vector2(0.5, 0.5);
		this.menu.Position = new UDim2(0.5, 0, 0.5, 0);
		this.menu.Size = new UDim2(0.8, 0, 0.8, 0);
		this.menu.BackgroundColor3 = Color3.fromRGB(22, 24, 38);
		this.menu.ZIndex = 10;
		this.menu.Parent = getHudGui();
		addCorner(this.menu, new UDim(0, 14));
		addStroke(this.menu, Color3.fromRGB(255, 200, 40), 2);

		const limit = new Instance("UISizeConstraint");
		limit.MaxSize = new Vector2(340, 420);
		limit.Parent = this.menu;

		const title = new Instance("TextLabel");
		title.Size = new UDim2(1, -56, 0, 44);
		title.Position = new UDim2(0, 16, 0, 4);
		title.BackgroundTransparency = 1;
		title.Font = Enum.Font.GothamBold;
		title.TextSize = 20;
		title.TextXAlignment = Enum.TextXAlignment.Left;
		title.TextColor3 = new Color3(1, 1, 1);
		title.Text = "⭐ Support the game";
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

		MonetizationConfig.DONATIONS.forEach((option, index) => {
			const button = createHudButton(list, `${option.robux} R$`, new UDim2(1, -8, 0, 46));
			button.LayoutOrder = index;
			button.Name = option.id;
			button.ZIndex = 12;
			button.TextColor3 = Color3.fromRGB(255, 200, 40);
			button.Activated.Connect(() => request.FireServer("Donation", option.id));
		});
	}
}
