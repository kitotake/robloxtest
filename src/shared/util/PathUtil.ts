import { GameConfig } from "shared/config/GameConfig";
import { MapConfig } from "shared/config/MapConfig";

const { PATH, CHARACTER, MAX_STEP, STEP_INTERVAL_SECONDS } = GameConfig;
const { CURVE, HEIGHT_ANCHORS } = MapConfig;

/** Height of the tile surface above the start, cosine-interpolated between the config anchors. */
function heightAt(step: number): number {
	for (let i = 0; i < HEIGHT_ANCHORS.size() - 1; i++) {
		const [fromStep, fromHeight] = HEIGHT_ANCHORS[i];
		const [toStep, toHeight] = HEIGHT_ANCHORS[i + 1];
		if (step >= fromStep && step <= toStep) {
			const t = toStep === fromStep ? 1 : (step - fromStep) / (toStep - fromStep);
			const smooth = (1 - math.cos(math.pi * t)) / 2;
			return fromHeight + (toHeight - fromHeight) * smooth;
		}
	}
	return HEIGHT_ANCHORS[HEIGHT_ANCHORS.size() - 1][1];
}

/** Heading change (radians) applied between tile `step` and tile `step + 1`. */
function turnAt(step: number): number {
	const { WAVE_1, WAVE_2, MAX_TURN_PER_STEP } = CURVE;
	const turn =
		WAVE_1.amplitude * math.sin((2 * math.pi * step) / WAVE_1.period + WAVE_1.phase) +
		WAVE_2.amplitude * math.sin((2 * math.pi * step) / WAVE_2.period + WAVE_2.phase);
	return math.clamp(turn, -MAX_TURN_PER_STEP, MAX_TURN_PER_STEP);
}

/**
 * The whole path is computed once from the config: both server and client run
 * this module, so they always agree on where tile N is. Consecutive tiles are
 * exactly TILE_SPACING apart horizontally (heights change by < 2.5 studs), which
 * is what `getAutoWalkSpeed` assumes.
 */
function buildPath(): { positions: Vector3[]; forwards: Vector3[] } {
	const positions: Vector3[] = [];
	let heading = 0;
	let flatPosition = new Vector3(PATH.START_POSITION.X, 0, PATH.START_POSITION.Z);

	for (let step = 0; step <= MAX_STEP; step++) {
		positions.push(new Vector3(flatPosition.X, PATH.START_POSITION.Y + heightAt(step), flatPosition.Z));
		const turn = turnAt(step);
		const midHeading = heading + turn / 2;
		const direction = CFrame.Angles(0, midHeading, 0).VectorToWorldSpace(PATH.DIRECTION);
		flatPosition = flatPosition.add(direction.mul(PATH.TILE_SPACING));
		heading += turn;
	}

	const forwards: Vector3[] = [];
	for (let step = 0; step <= MAX_STEP; step++) {
		const before = positions[math.max(step - 1, 0)];
		const after = positions[math.min(step + 1, MAX_STEP)];
		forwards.push(after.sub(before).Unit);
	}
	return { positions, forwards };
}

const { positions: STEP_POSITIONS, forwards: STEP_FORWARDS } = buildPath();

function indexOf(step: number): number {
	return math.clamp(math.floor(step), 0, MAX_STEP);
}

/** Top-centre of the given tile. */
export function getStepPosition(step: number): Vector3 {
	return STEP_POSITIONS[indexOf(step)];
}

/** Unit vector pointing along the path at the given tile (includes the slope). */
export function getStepForward(step: number): Vector3 {
	return STEP_FORWARDS[indexOf(step)];
}

/** Same as getStepForward but flattened to the horizontal plane. */
export function getStepForwardFlat(step: number): Vector3 {
	const forward = getStepForward(step);
	return new Vector3(forward.X, 0, forward.Z).Unit;
}

/** Surface frame of the tile: origin = top-centre, looking along the path, pitched with the slope. */
export function getStepSurfaceCFrame(step: number): CFrame {
	const position = getStepPosition(step);
	return CFrame.lookAt(position, position.add(getStepForward(step)));
}

/** Where a character should stand (and face) for the given step. */
export function getStepSpawnCFrame(step: number): CFrame {
	const position = getStepPosition(step).add(new Vector3(0, CHARACTER.SPAWN_HEIGHT, 0));
	return CFrame.lookAt(position, position.add(getStepForwardFlat(step)));
}

/** Tile width: every 10th tile is a wide plaza, its neighbours are slightly wider. */
export function getTileWidth(step: number): number {
	if (step === MAX_STEP || step % 10 === 0) return MapConfig.TILE_WIDTH_PLAZA;
	if (step % 10 === 1 || step % 10 === 9) return MapConfig.TILE_WIDTH_NEAR_PLAZA;
	return PATH.TILE_WIDTH;
}

/** Walk speed that makes the character cover one tile per step interval. */
export function getAutoWalkSpeed(): number {
	return math.max(PATH.TILE_SPACING / STEP_INTERVAL_SECONDS, 2);
}
