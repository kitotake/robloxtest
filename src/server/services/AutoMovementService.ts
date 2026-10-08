import { Players, RunService } from "@rbxts/services";
import { GameConfig } from "shared/config/GameConfig";
import { createLogger } from "shared/util/Logger";
import { getAutoWalkSpeed, getStepSpawnCFrame } from "shared/util/PathUtil";
import { ProgressionService } from "./ProgressionService";

const log = createLogger("AutoMovementService");

/**
 * Drives the automatic progression: a server timer advances each living player
 * by one step every STEP_INTERVAL_SECONDS (via ProgressionService). The client
 * only walks the avatar toward the next tile.
 *
 * The avatar is placed on the tile of the last validated step when it spawns
 * or when the progression is changed by the game (skip, reset, ...). A living
 * player is never moved back automatically: falling or dying only affects the
 * avatar, not the progression.
 */
export class AutoMovementService {
	private readonly stepTimers = new Map<Player, number>();

	constructor(private readonly progression: ProgressionService) {}

	start(): void {
		Players.PlayerAdded.Connect((player) => this.setupPlayer(player));
		Players.PlayerRemoving.Connect((player) => this.stepTimers.delete(player));
		for (const player of Players.GetPlayers()) this.setupPlayer(player);

		// The session run has just started: put an already-spawned character on its tile (step 0).
		this.progression.sessionStarted.connect((player) => {
			if (GameConfig.RESPAWN.PLACE_AT_PROGRESS) this.placeCharacter(player, this.progression.getProgress(player));
		});

		this.progression.changed.connect((player, newStep, _old, reason) => {
			this.stepTimers.set(player, 0);
			if (reason !== "Auto") this.placeCharacter(player, newStep);
			// A fresh run starts: back to the slow automatic walk.
			if (reason === "Reset") this.setWalkSpeed(player, getAutoWalkSpeed());
		});

		// The run is over: the player can walk around the final area at a normal speed.
		this.progression.runCompleted.connect((player) => this.setWalkSpeed(player, GameConfig.FREE_WALK_SPEED));

		RunService.Heartbeat.Connect((dt) => this.update(dt));
	}

	private setupPlayer(player: Player): void {
		this.stepTimers.set(player, 0);
		player.CharacterAdded.Connect((character) => this.onCharacterAdded(player, character));
		if (player.Character !== undefined) this.onCharacterAdded(player, player.Character);
	}

	private onCharacterAdded(player: Player, character: Model): void {
		const humanoid = character.WaitForChild("Humanoid") as Humanoid;
		character.WaitForChild("HumanoidRootPart");
		humanoid.WalkSpeed =
			this.progression.getState(player)?.completed === true ? GameConfig.FREE_WALK_SPEED : getAutoWalkSpeed();
		// Before the session run starts there is nothing to place on; `sessionStarted` handles that case.
		if (GameConfig.RESPAWN.PLACE_AT_PROGRESS && this.progression.getState(player) !== undefined) {
			const step = this.progression.getProgress(player);
			log.debug(`Placing ${player.Name} at step ${step} on spawn`);
			this.placeCharacter(player, step);
		}
	}

	private setWalkSpeed(player: Player, speed: number): void {
		const humanoid = player.Character?.FindFirstChildOfClass("Humanoid");
		if (humanoid !== undefined) humanoid.WalkSpeed = speed;
	}

	private placeCharacter(player: Player, step: number): void {
		const character = player.Character;
		if (character === undefined) return;
		character.PivotTo(getStepSpawnCFrame(step));
		const root = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
		if (root !== undefined) {
			root.AssemblyLinearVelocity = Vector3.zero;
		}
	}

	private update(dt: number): void {
		for (const player of Players.GetPlayers()) {
			const state = this.progression.getState(player);
			const humanoid = player.Character?.FindFirstChildOfClass("Humanoid");
			// No character (respawning) or dead: the step timer simply waits.
			if (state === undefined || humanoid === undefined || humanoid.Health <= 0) continue;
			if (state.paused || state.completed) continue;

			const elapsed = (this.stepTimers.get(player) ?? 0) + dt;
			if (elapsed >= GameConfig.STEP_INTERVAL_SECONDS) {
				this.stepTimers.set(player, elapsed - GameConfig.STEP_INTERVAL_SECONDS);
				this.progression.advancePlayer(player, 1, "Auto");
			} else {
				this.stepTimers.set(player, elapsed);
			}
		}
	}
}
