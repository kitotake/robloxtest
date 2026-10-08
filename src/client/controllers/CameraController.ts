import { Players } from "@rbxts/services";
import { MapConfig } from "shared/config/MapConfig";

/**
 * Limits how far the player can zoom out. The normal Roblox camera is kept
 * (mouse, touch and gamepad all keep working): only the maximum distance is
 * capped, using the Player's own zoom properties. Set once, no per-frame work.
 */
export class CameraController {
	private readonly player = Players.LocalPlayer;

	start(): void {
		const maxZoom = MapConfig.CAMERA.MAX_ZOOM_DISTANCE;
		// CameraMaxZoomDistance must stay >= CameraMinZoomDistance.
		if (this.player.CameraMinZoomDistance > maxZoom) this.player.CameraMinZoomDistance = 0.5;
		this.player.CameraMaxZoomDistance = maxZoom;
	}
}
