import { Players } from "@rbxts/services";
import { addCorner, addStroke } from "./UIHelpers";

const HUD_NAME = "HUD";
const SIDEBAR_NAME = "SideBar";

/** Shared HUD ScreenGui used by the bottom/side controls (created on first use). */
export function getHudGui(): ScreenGui {
	const playerGui = Players.LocalPlayer.WaitForChild("PlayerGui");
	const existing = playerGui.FindFirstChild(HUD_NAME);
	if (existing !== undefined) return existing as ScreenGui;

	const gui = new Instance("ScreenGui");
	gui.Name = HUD_NAME;
	gui.ResetOnSpawn = false;
	gui.IgnoreGuiInset = false;
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling;
	gui.DisplayOrder = 5;
	gui.Parent = playerGui;
	return gui;
}

/** Right-hand column holding the ruby balance and the menu buttons. */
export function getSideBar(): Frame {
	const hud = getHudGui();
	const existing = hud.FindFirstChild(SIDEBAR_NAME);
	if (existing !== undefined) return existing as Frame;

	const bar = new Instance("Frame");
	bar.Name = SIDEBAR_NAME;
	bar.AnchorPoint = new Vector2(1, 0.5);
	bar.Position = new UDim2(1, -10, 0.5, 0);
	bar.Size = new UDim2(0, 104, 0, 0);
	bar.AutomaticSize = Enum.AutomaticSize.Y;
	bar.BackgroundTransparency = 1;
	bar.Parent = hud;

	const layout = new Instance("UIListLayout");
	layout.FillDirection = Enum.FillDirection.Vertical;
	layout.HorizontalAlignment = Enum.HorizontalAlignment.Right;
	layout.Padding = new UDim(0, 8);
	layout.SortOrder = Enum.SortOrder.LayoutOrder;
	layout.Parent = bar;
	return bar;
}

/** Rounded dark pill/button used by the HUD. */
export function createHudButton(parent: Instance, text: string, size: UDim2): TextButton {
	const button = new Instance("TextButton");
	button.Size = size;
	button.BackgroundColor3 = Color3.fromRGB(30, 34, 52);
	button.AutoButtonColor = true;
	button.Font = Enum.Font.GothamBold;
	button.TextSize = 16;
	button.TextColor3 = new Color3(1, 1, 1);
	button.Text = text;
	button.Parent = parent;
	addCorner(button, new UDim(0, 10));
	addStroke(button, Color3.fromRGB(255, 255, 255), 1.5).Transparency = 0.6;
	return button;
}
