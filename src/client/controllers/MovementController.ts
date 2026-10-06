import { Players } from "@rbxts/services";
import { GameConfig } from "shared/config/GameConfig";
import { getStepPosition } from "shared/util/PathUtil";
import { ProgressStore } from "../stores/ProgressStore";

interface ControlsModule {
	GetControls(): { Disable(): void };
}

/**
 * Walks the local avatar toward the next tile. Purely cosmetic: the server
 * decides the real step and repositions the character if it ever disagrees.
 */
export class MovementController {
	private readonly localPlayer = Players.LocalPlayer;

	constructor(private readonly store: ProgressStore) {}

	start(): void {
		if (GameConfig.DISABLE_MANUAL_CONTROLS) this.disableControls();

		this.store.changed.connect((userId, step) => {
			if (userId === this.localPlayer.UserId) this.walkToward(step);
		});

		this.localPlayer.CharacterAdded.Connect(() => {
			task.defer(() => this.walkToward(this.store.get(this.localPlayer.UserId) ?? 0));
		});
	}

	private walkToward(step: number): void {
		const humanoid = this.localPlayer.Character?.FindFirstChildOfClass("Humanoid");
		if (humanoid === undefined) return;
		// Aim one tile ahead so the avatar walks continuously instead of stop-and-go.
		humanoid.MoveTo(getStepPosition(math.min(step + 1, GameConfig.MAX_STEP)));
	}

	private disableControls(): void {
		task.spawn(() => {
			const scripts = this.localPlayer.WaitForChild("PlayerScripts");
			const module = scripts.WaitForChild("PlayerModule") as ModuleScript;
			pcall(() => (require(module) as unknown as ControlsModule).GetControls().Disable());
		});
	}
}
