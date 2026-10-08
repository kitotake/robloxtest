import { GameConfig } from "shared/config/GameConfig";
import { getZoneForStep, ZONES } from "shared/config/MapConfig";
import { getTileWidth } from "shared/util/PathUtil";
import { makeBall, makeFolder, makePillar } from "./MapBuilders";
import { place, rgb } from "./PathFrame";

const { MAX_STEP } = GameConfig;

/**
 * Lighting and guides along the route itself:
 *  - a small lamp on each side of the path every 4 tiles (neon bulbs, no real lights),
 *  - at the end of every zone, glowing orbs in the NEXT zone's colour so the
 *    change of atmosphere is announced before the gate.
 */
export function buildPathFraming(root: Folder): void {
	const folder = makeFolder("PathFraming", root);
	const lamps = makeFolder("Lamps", folder);
	const previews = makeFolder("ZonePreviews", folder);

	for (let step = 2; step < MAX_STEP; step += 4) {
		const zone = getZoneForStep(step);
		const edge = getTileWidth(step) / 2 + 0.4;
		for (const side of [-1, 1]) {
			const bottom = place(step, side * edge, -0.8);
			makePillar(lamps, "LampPost", bottom, 4.6, 0.5, rgb(55, 55, 64), Enum.Material.Metal);
			makeBall(lamps, "LampBulb", bottom.add(new Vector3(0, 5, 0)), 1.4, zone.accentColor, Enum.Material.Neon);
		}
	}

	for (let i = 0; i < ZONES.size() - 2; i++) {
		const nextZone = ZONES[i + 1];
		for (let k = 0; k < 3; k++) {
			const step = ZONES[i].toStep - 2 + k;
			const edge = getTileWidth(step) / 2 + 5;
			for (const side of [-1, 1]) {
				makeBall(
					previews,
					"Preview",
					place(step, side * edge, 3 + k * 1.5, 2),
					1.2 + k * 0.4,
					nextZone.accentColor,
					Enum.Material.Neon,
					0.1,
				);
			}
		}
	}
}
