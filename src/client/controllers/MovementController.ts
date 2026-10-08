import { Players } from "@rbxts/services";
import { GameConfig } from "shared/config/GameConfig";
import { getStepPosition } from "shared/util/PathUtil";
import { ProgressStore } from "../stores/ProgressStore";

interface ControlsModule {
	GetControls(): { Disable(): void; Enable(): void };
}

/**
 * Walks the local avatar toward the next tile. Purely cosmetic: the server
 * decides the real step and repositions the character if it ever disagrees.
 * Once the local player has reached the last step the automatic walk ends and
 * manual controls come back, so they can move freely on the final platform.
 */
export class MovementController {
	private readonly localPlayer = Players.LocalPlayer;
	private controlsEnabled = true;

	constructor(private readonly store: ProgressStore) {}

	start(): void {
		if (GameConfig.DISABLE_MANUAL_CONTROLS) this.setControls(false);

		this.store.changed.connect((userId, step) => {
			if (userId !== this.localPlayer.UserId) return;
			if (step >= GameConfig.MAX_STEP) this.finishRun();
			else {
				// A new run (reset): automatic walk again.
				if (GameConfig.DISABLE_MANUAL_CONTROLS) this.setControls(false);
				this.walkToward(step);
			}
		});

		this.localPlayer.CharacterAdded.Connect(() => {
			task.defer(() => {
				const step = this.store.get(this.localPlayer.UserId) ?? 0;
				// Already finished: the server puts the avatar on the final tile, nothing to walk to.
				if (step >= GameConfig.MAX_STEP) this.setControls(true);
				else this.walkToward(step);
			});
		});
	}

	private walkToward(step: number): void {
		const humanoid = this.localPlayer.Character?.FindFirstChildOfClass("Humanoid");
		if (humanoid === undefined) return;
		// Aim one tile ahead so the avatar walks continuously instead of stop-and-go.
		humanoid.MoveTo(getStepPosition(math.min(step + 1, GameConfig.MAX_STEP)));
	}

	/** Reached the last step: finish the walk onto the final tile, then hand the controls back. */
	private finishRun(): void {
		const humanoid = this.localPlayer.Character?.FindFirstChildOfClass("Humanoid");
		if (humanoid === undefined) {
			this.setControls(true);
			return;
		}
		// MoveToFinished also fires after its own timeout, so this can never stay locked.
		humanoid.MoveToFinished.Once(() => this.setControls(true));
		this.walkToward(GameConfig.MAX_STEP);
	}

	private setControls(enabled: boolean): void {
		if (!GameConfig.DISABLE_MANUAL_CONTROLS || enabled === this.controlsEnabled) return;
		this.controlsEnabled = enabled;
		task.spawn(() => {
			const scripts = this.localPlayer.WaitForChild("PlayerScripts");
			const module = scripts.WaitForChild("PlayerModule") as ModuleScript;
			pcall(() => {
				const controls = (require(module) as unknown as ControlsModule).GetControls();
				if (enabled) controls.Enable();
				else controls.Disable();
			});
		});
	}
}
