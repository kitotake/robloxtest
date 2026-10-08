import { MapConfig } from "shared/config/MapConfig";
import { getStepSurfaceCFrame } from "shared/util/PathUtil";

/** World position at (lateral, up, ahead) relative to the surface of a tile. */
export function place(step: number, lateral: number, up: number, ahead = 0): Vector3 {
	return getStepSurfaceCFrame(step).PointToWorldSpace(new Vector3(lateral, up, -ahead));
}

/** Same offset, but returned as a CFrame oriented like the tile (looking along the path). */
export function facing(step: number, lateral: number, up: number, ahead = 0): CFrame {
	return new CFrame(place(step, lateral, up, ahead)).mul(getStepSurfaceCFrame(step).Rotation);
}

/** Deterministic Random: the same (layer, step) gives the same numbers on every server. */
export function seeded(layer: number, step: number): Random {
	return new Random(MapConfig.SEED + layer * 1000 + step);
}

/** Layers (seed namespaces) of the generated environment. */
export const Layer = { Props: 1, Backdrop: 2, Landmarks: 3, Particles: 4 } as const;

export const rgb = (r: number, g: number, b: number): Color3 => Color3.fromRGB(r, g, b);
