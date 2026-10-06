import { GameConfig } from "shared/config/GameConfig";

const { PATH, CHARACTER, MAX_STEP, STEP_INTERVAL_SECONDS } = GameConfig;

/** Top-centre of the given tile. */
export function getStepPosition(step: number): Vector3 {
	const clamped = math.clamp(step, 0, MAX_STEP);
	return PATH.START_POSITION.add(PATH.DIRECTION.mul(PATH.TILE_SPACING * clamped));
}

/** Where a character should stand (and face) for the given step. */
export function getStepSpawnCFrame(step: number): CFrame {
	const position = getStepPosition(step).add(new Vector3(0, CHARACTER.SPAWN_HEIGHT, 0));
	return CFrame.lookAt(position, position.add(PATH.DIRECTION));
}

/** Walk speed that makes the character cover one tile per step interval. */
export function getAutoWalkSpeed(): number {
	return math.max(PATH.TILE_SPACING / STEP_INTERVAL_SECONDS, 2);
}
