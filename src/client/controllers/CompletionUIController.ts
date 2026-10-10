import { Players, TweenService } from "@rbxts/services";
import { CompletionConfig } from "shared/config/CompletionConfig";
import { getRemoteEvent, RemoteNames } from "shared/remotes";
import { CompletionResult } from "shared/types/CompletionTypes";
import { getTitle } from "shared/util/TitleUtil";

const GOLD = Color3.fromRGB(255, 200, 40);
const CYAN = Color3.fromRGB(0, 240, 255);
const CONFETTI_COLORS = [
	Color3.fromRGB(255, 200, 40),
	Color3.fromRGB(255, 120, 170),
	Color3.fromRGB(100, 190, 255),
	Color3.fromRGB(120, 230, 140),
	Color3.fromRGB(190, 120, 255),
];

/**
 * "YOU MADE IT" screen. Pure interface: it never touches the camera, the
 * lighting or the character, never blocks input (the player keeps walking
 * around the final area), and removes itself after a few seconds.
 */
export class CompletionUIController {
	private gui: ScreenGui | undefined;
	private token = 0;
	private readonly random = new Random();

	start(): void {
		getRemoteEvent(RemoteNames.RunCompleted).OnClientEvent.Connect((result: CompletionResult) => this.show(result));
	}

	private show(result: CompletionResult): void {
		this.token += 1;
		const token = this.token;
		this.gui?.Destroy();

		const gui = new Instance("ScreenGui");
		gui.Name = "CompletionUI";
		gui.ResetOnSpawn = false;
		gui.IgnoreGuiInset = true;
		gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling;
		gui.DisplayOrder = 30;
		gui.Parent = Players.LocalPlayer.WaitForChild("PlayerGui");
		this.gui = gui;

		this.spawnConfetti(gui);
		const lines = this.buildPanel(gui, result);

		task.delay(CompletionConfig.DISPLAY_SECONDS, () => {
			if (token !== this.token) return; // a newer presentation replaced this one
			for (const label of lines) {
				TweenService.Create(label, new TweenInfo(0.6), {
					TextTransparency: 1,
					TextStrokeTransparency: 1,
				}).Play();
			}
			task.delay(0.7, () => {
				if (token === this.token) gui.Destroy();
			});
		});
	}

	private buildPanel(gui: ScreenGui, result: CompletionResult): TextLabel[] {
		const panel = new Instance("Frame");
		panel.Name = "Panel";
		panel.AnchorPoint = new Vector2(0.5, 0.5);
		panel.Position = new UDim2(0.5, 0, 0.36, 0);
		panel.Size = new UDim2(0.9, 0, 0, 0);
		panel.AutomaticSize = Enum.AutomaticSize.Y;
		panel.BackgroundTransparency = 1;
		panel.Active = false;
		panel.Parent = gui;

		const limit = new Instance("UISizeConstraint");
		limit.MaxSize = new Vector2(640, 10000);
		limit.Parent = panel;

		const layout = new Instance("UIListLayout");
		layout.HorizontalAlignment = Enum.HorizontalAlignment.Center;
		layout.Padding = new UDim(0, 6);
		layout.SortOrder = Enum.SortOrder.LayoutOrder;
		layout.Parent = panel;

		const scale = new Instance("UIScale");
		scale.Scale = 0.4;
		scale.Parent = panel;
		TweenService.Create(scale, new TweenInfo(0.6, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
			Scale: 1,
		}).Play();

		const labels: TextLabel[] = [];
		const addLine = (text: string, color: Color3, height: number, textSize: number, delaySeconds: number): void => {
			const label = new Instance("TextLabel");
			label.LayoutOrder = labels.size();
			label.Size = new UDim2(1, 0, 0, height);
			label.BackgroundTransparency = 1;
			label.Font = Enum.Font.GothamBlack;
			label.TextScaled = true;
			label.TextColor3 = color;
			label.TextStrokeTransparency = 0.3;
			label.TextTransparency = 1;
			label.Text = text;
			label.Active = false;
			label.Parent = panel;
			const textLimit = new Instance("UITextSizeConstraint");
			textLimit.MaxTextSize = textSize;
			textLimit.Parent = label;
			labels.push(label);
			task.delay(delaySeconds, () =>
				TweenService.Create(label, new TweenInfo(0.4), { TextTransparency: 0 }).Play(),
			);
		};

		addLine(CompletionConfig.HEADLINE, GOLD, 80, 72, 0);
		addLine(`🏆 Victory #${result.totalVictories}`, new Color3(1, 1, 1), 34, 28, 0.6);
		if (result.noSkipEarned) {
			addLine(`⭐ ${CompletionConfig.NO_SKIP_LINE}`, CYAN, 38, 30, 1.1);
			if (result.noSkipFirstTime) addLine(CompletionConfig.NO_SKIP_FIRST_TIME_LINE, CYAN, 26, 20, 1.5);
		} else {
			addLine(CompletionConfig.NO_SKIP_MISSED_LINE, Color3.fromRGB(170, 170, 190), 24, 18, 1.1);
		}
		let delaySeconds = 1.6;
		for (const id of result.newTitles) {
			const title = getTitle(id);
			if (title === undefined) continue;
			addLine(`New title: [${title.displayName}]`, title.color, 30, 24, delaySeconds);
			delaySeconds += 0.4;
		}
		addLine(CompletionConfig.TEASER_LINE, Color3.fromRGB(190, 150, 255), 24, 18, delaySeconds + 0.4);
		return labels;
	}

	/** A one-off burst of falling paper pieces; removed with the screen. */
	private spawnConfetti(gui: ScreenGui): void {
		const layer = new Instance("Frame");
		layer.Name = "Confetti";
		layer.Size = new UDim2(1, 0, 1, 0);
		layer.BackgroundTransparency = 1;
		layer.Active = false;
		layer.Parent = gui;

		for (let index = 0; index < CompletionConfig.CONFETTI_COUNT; index++) {
			const piece = new Instance("Frame");
			const size = this.random.NextInteger(6, 12);
			piece.Size = new UDim2(0, size, 0, size + 4);
			piece.Position = new UDim2(this.random.NextNumber(0, 1), 0, 0, -20);
			piece.BackgroundColor3 = CONFETTI_COLORS[this.random.NextInteger(0, CONFETTI_COLORS.size() - 1)];
			piece.BorderSizePixel = 0;
			piece.Rotation = this.random.NextInteger(0, 360);
			piece.Parent = layer;

			const fall = this.random.NextNumber(3, 5.5);
			const sway = this.random.NextNumber(-0.08, 0.08);
			task.delay(this.random.NextNumber(0, 1.4), () => {
				TweenService.Create(piece, new TweenInfo(fall, Enum.EasingStyle.Sine), {
					Position: new UDim2(piece.Position.X.Scale + sway, 0, 1.1, 0),
					Rotation: piece.Rotation + this.random.NextInteger(-360, 360),
				}).Play();
			});
		}
	}
}
