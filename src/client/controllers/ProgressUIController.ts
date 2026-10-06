import { Players, TweenService } from "@rbxts/services";
import { GameConfig } from "shared/config/GameConfig";
import { ProgressStore } from "../stores/ProgressStore";
import { addCorner, addStroke } from "../ui/UIHelpers";
import { FriendsController } from "./FriendsController";

const LOCAL_MARKER_SIZE = 46;
const FRIEND_MARKER_SIZE = 28;
const BAR_HEIGHT = 14;
const SIDE_MARGIN = 32;
const MOVE_TWEEN = new TweenInfo(0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out);

interface MarkerView {
	frame: Frame;
	image: ImageLabel;
}

/**
 * Top progression bar: shows the local player (large marker) and the friends
 * currently in the server (small markers). Random players are never shown.
 */
export class ProgressUIController {
	private readonly localPlayer = Players.LocalPlayer;
	private readonly markers = new Map<number, MarkerView>();
	private readonly thumbnails = new Map<number, string>();
	private fill!: Frame;
	private markerLayer!: Frame;
	private stepLabel!: TextLabel;

	constructor(
		private readonly store: ProgressStore,
		private readonly friends: FriendsController,
	) {}

	start(): void {
		this.buildUi();

		this.store.changed.connect((userId, step) => {
			if (userId === this.localPlayer.UserId) this.updateLocalDisplay(step);
			this.refreshMarker(userId);
		});
		this.friends.changed.connect((userId) => this.refreshMarker(userId));

		const localStep = this.store.get(this.localPlayer.UserId) ?? 0;
		this.updateLocalDisplay(localStep);
		this.refreshMarker(this.localPlayer.UserId);
	}

	private buildUi(): void {
		const gui = new Instance("ScreenGui");
		gui.Name = "ProgressUI";
		gui.ResetOnSpawn = false;
		gui.IgnoreGuiInset = false;
		gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling;
		gui.DisplayOrder = 10;

		const container = new Instance("Frame");
		container.Name = "ProgressBar";
		container.AnchorPoint = new Vector2(0.5, 0);
		container.Position = new UDim2(0.5, 0, 0, 10);
		container.Size = new UDim2(0.6, 0, 0, 92);
		container.BackgroundTransparency = 1;
		container.Parent = gui;

		// Keeps the bar readable on phones and not absurdly wide on large monitors.
		const constraint = new Instance("UISizeConstraint");
		constraint.MinSize = new Vector2(300, 92);
		constraint.MaxSize = new Vector2(900, 92);
		constraint.Parent = container;

		const rail = new Instance("Frame");
		rail.Name = "Rail";
		rail.Position = new UDim2(0, SIDE_MARGIN, 0, 38);
		rail.Size = new UDim2(1, -SIDE_MARGIN * 2, 0, BAR_HEIGHT);
		rail.BackgroundColor3 = Color3.fromRGB(24, 26, 38);
		rail.BorderSizePixel = 0;
		rail.Parent = container;
		addCorner(rail, new UDim(0.5, 0));
		addStroke(rail, Color3.fromRGB(255, 255, 255), 2).Transparency = 0.6;

		this.fill = new Instance("Frame");
		this.fill.Name = "Fill";
		this.fill.Size = new UDim2(0, 0, 1, 0);
		this.fill.BackgroundColor3 = Color3.fromRGB(255, 255, 255);
		this.fill.BorderSizePixel = 0;
		this.fill.Parent = rail;
		addCorner(this.fill, new UDim(0.5, 0));
		const gradient = new Instance("UIGradient");
		gradient.Color = new ColorSequence(Color3.fromRGB(70, 200, 110), Color3.fromRGB(255, 200, 40));
		gradient.Parent = this.fill;

		this.markerLayer = new Instance("Frame");
		this.markerLayer.Name = "Markers";
		this.markerLayer.Size = new UDim2(1, 0, 1, 0);
		this.markerLayer.BackgroundTransparency = 1;
		this.markerLayer.Parent = rail;

		this.createEndLabel(container, "0", new UDim2(0, 0, 0, 38));
		this.createEndLabel(container, tostring(GameConfig.MAX_STEP), new UDim2(1, -SIDE_MARGIN, 0, 38));

		this.stepLabel = new Instance("TextLabel");
		this.stepLabel.Name = "StepLabel";
		this.stepLabel.Position = new UDim2(0, 0, 0, 62);
		this.stepLabel.Size = new UDim2(1, 0, 0, 28);
		this.stepLabel.BackgroundTransparency = 1;
		this.stepLabel.Font = Enum.Font.GothamBold;
		this.stepLabel.TextSize = 22;
		this.stepLabel.TextColor3 = new Color3(1, 1, 1);
		this.stepLabel.TextStrokeTransparency = 0.5;
		this.stepLabel.Parent = container;

		gui.Parent = this.localPlayer.WaitForChild("PlayerGui");
	}

	private createEndLabel(parent: Frame, text: string, position: UDim2): void {
		const label = new Instance("TextLabel");
		label.Position = position;
		label.Size = new UDim2(0, SIDE_MARGIN, 0, BAR_HEIGHT);
		label.BackgroundTransparency = 1;
		label.Font = Enum.Font.GothamBold;
		label.TextSize = 14;
		label.Text = text;
		label.TextColor3 = new Color3(1, 1, 1);
		label.TextStrokeTransparency = 0.5;
		label.Parent = parent;
	}

	private updateLocalDisplay(step: number): void {
		this.stepLabel.Text = `${step} / ${GameConfig.MAX_STEP}`;
		TweenService.Create(this.fill, MOVE_TWEEN, {
			Size: new UDim2(step / GameConfig.MAX_STEP, 0, 1, 0),
		}).Play();
	}

	/** Creates, moves or removes the marker of a single player. */
	private refreshMarker(userId: number): void {
		const isLocal = userId === this.localPlayer.UserId;
		const visible = isLocal || (this.friends.isFriend(userId) && Players.GetPlayerByUserId(userId) !== undefined);
		const step = this.store.get(userId) ?? (isLocal ? 0 : undefined);

		if (!visible || step === undefined) {
			this.removeMarker(userId);
			return;
		}

		const position = new UDim2(step / GameConfig.MAX_STEP, 0, 0.5, 0);
		const existing = this.markers.get(userId);
		if (existing === undefined) {
			const marker = this.createMarker(userId, isLocal);
			marker.frame.Position = position;
			this.markers.set(userId, marker);
		} else {
			TweenService.Create(existing.frame, MOVE_TWEEN, { Position: position }).Play();
		}
	}

	private createMarker(userId: number, isLocal: boolean): MarkerView {
		const size = isLocal ? LOCAL_MARKER_SIZE : FRIEND_MARKER_SIZE;

		const frame = new Instance("Frame");
		frame.Name = `Marker_${userId}`;
		frame.AnchorPoint = new Vector2(0.5, 0.5);
		frame.Size = new UDim2(0, size, 0, size);
		frame.BackgroundColor3 = Color3.fromRGB(30, 32, 46);
		frame.BorderSizePixel = 0;
		frame.ZIndex = isLocal ? 5 : 3;
		frame.Parent = this.markerLayer;
		addCorner(frame, new UDim(0.5, 0));
		addStroke(frame, isLocal ? Color3.fromRGB(255, 200, 40) : Color3.fromRGB(90, 170, 255), isLocal ? 3 : 2);

		const image = new Instance("ImageLabel");
		image.Size = new UDim2(1, 0, 1, 0);
		image.BackgroundTransparency = 1;
		image.Parent = frame;
		addCorner(image, new UDim(0.5, 0));

		this.loadThumbnail(userId, image);
		return { frame, image };
	}

	private removeMarker(userId: number): void {
		const marker = this.markers.get(userId);
		if (marker === undefined) return;
		marker.frame.Destroy();
		this.markers.delete(userId);
	}

	private loadThumbnail(userId: number, image: ImageLabel): void {
		const cached = this.thumbnails.get(userId);
		if (cached !== undefined) {
			image.Image = cached;
			return;
		}
		task.spawn(() => {
			const [ok, content] = pcall(() => {
				const [url] = Players.GetUserThumbnailAsync(
					userId,
					Enum.ThumbnailType.HeadShot,
					Enum.ThumbnailSize.Size100x100,
				);
				return url;
			});
			if (ok) {
				this.thumbnails.set(userId, content as string);
				image.Image = content as string;
			}
		});
	}
}
