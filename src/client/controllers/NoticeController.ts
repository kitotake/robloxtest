import { TweenService } from "@rbxts/services";
import { getRemoteEvent, RemoteNames } from "shared/remotes";
import { addCorner } from "../ui/UIHelpers";
import { getHudGui } from "../ui/Hud";

const VISIBLE_SECONDS = 3;

/** Short feedback messages sent by the server (purchase results, errors). */
export class NoticeController {
	private label!: TextLabel;
	private token = 0;

	start(): void {
		this.label = new Instance("TextLabel");
		this.label.Name = "Notice";
		this.label.AnchorPoint = new Vector2(0.5, 1);
		this.label.Position = new UDim2(0.5, 0, 1, -86);
		this.label.Size = new UDim2(0, 320, 0, 38);
		this.label.BackgroundColor3 = Color3.fromRGB(20, 22, 34);
		this.label.BackgroundTransparency = 1;
		this.label.TextTransparency = 1;
		this.label.Font = Enum.Font.GothamBold;
		this.label.TextSize = 16;
		this.label.TextWrapped = true;
		this.label.Parent = getHudGui();
		addCorner(this.label, new UDim(0, 10));

		getRemoteEvent(RemoteNames.Notice).OnClientEvent.Connect((kind: string, text: string) =>
			this.show(kind === "error" ? Color3.fromRGB(255, 120, 120) : Color3.fromRGB(255, 255, 255), text),
		);
	}

	private show(color: Color3, text: string): void {
		this.token += 1;
		const current = this.token;
		this.label.Text = text;
		this.label.TextColor3 = color;
		this.label.BackgroundTransparency = 0.2;
		this.label.TextTransparency = 0;

		task.delay(VISIBLE_SECONDS, () => {
			if (current !== this.token) return; // a newer message replaced this one
			const info = new TweenInfo(0.4);
			TweenService.Create(this.label, info, { BackgroundTransparency: 1, TextTransparency: 1 }).Play();
		});
	}
}
