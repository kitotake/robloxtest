import { SKIPS } from "shared/config/SkipConfig";
import { getRemoteEvent, RemoteNames } from "shared/remotes";
import { createHudButton, getHudGui } from "../ui/Hud";

/** Bottom row of skip buttons. Prices are display only; the server decides everything. */
export class SkipUIController {
	start(): void {
		const request = getRemoteEvent(RemoteNames.RequestPurchase);

		const row = new Instance("Frame");
		row.Name = "SkipButtons";
		row.AnchorPoint = new Vector2(0.5, 1);
		row.Position = new UDim2(0.5, 0, 1, -14);
		row.Size = new UDim2(0, 0, 0, 56);
		row.AutomaticSize = Enum.AutomaticSize.X;
		row.BackgroundTransparency = 1;
		row.Parent = getHudGui();

		const layout = new Instance("UIListLayout");
		layout.FillDirection = Enum.FillDirection.Horizontal;
		layout.HorizontalAlignment = Enum.HorizontalAlignment.Center;
		layout.Padding = new UDim(0, 10);
		layout.SortOrder = Enum.SortOrder.LayoutOrder;
		layout.Parent = row;

		SKIPS.forEach((option, index) => {
			const button = createHudButton(row, "", new UDim2(0, 112, 1, 0));
			button.LayoutOrder = index;
			button.Name = option.id;

			const title = new Instance("TextLabel");
			title.Size = new UDim2(1, 0, 0.5, 0);
			title.Position = new UDim2(0, 0, 0.08, 0);
			title.BackgroundTransparency = 1;
			title.Font = Enum.Font.GothamBold;
			title.TextSize = 16;
			title.TextColor3 = new Color3(1, 1, 1);
			title.Text = `Skip ${option.amount}`;
			title.Parent = button;

			const price = new Instance("TextLabel");
			price.Size = new UDim2(1, 0, 0.4, 0);
			price.Position = new UDim2(0, 0, 0.52, 0);
			price.BackgroundTransparency = 1;
			price.Font = Enum.Font.GothamBold;
			price.TextSize = 14;
			price.TextColor3 = Color3.fromRGB(255, 200, 40);
			price.Text = `${option.priceRobux} R$`;
			price.Parent = button;

			button.Activated.Connect(() => request.FireServer("Skip", option.id));
		});
	}
}
