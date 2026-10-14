import { ZONES } from "shared/config/MapConfig";
import { getStepSurfaceCFrame } from "shared/util/PathUtil";
import { addFaceText, makeFolder, makePart } from "./MapBuilders";

const rgb = (r: number, g: number, b: number): Color3 => Color3.fromRGB(r, g, b);

/**
 * Block arrow "↑" lying flat on a tile, pointing along the path: a stem, a
 * 3-stud head row and a 1-stud tip, all on the 1-stud grid of the tile.
 */
function buildArrow(parent: Instance, tile: CFrame, ahead: number, color: Color3): void {
	const rows: [number, number, number][] = [
		// width, depth, z offset (towards the front of the tile)
		[1, 2, ahead - 1],
		[3, 1, ahead],
		[1, 1, ahead + 1],
	];
	for (const [width, depth, z] of rows) {
		makePart({
			name: "Arrow",
			parent,
			size: new Vector3(width, 0.2, depth),
			cframe: tile.mul(new CFrame(0, 0.1, -z)),
			color,
			material: Enum.Material.Neon,
		});
	}
}

/**
 * Welcome area around tile 0: a grass start platform behind the spawn, a gate
 * with the game title over tile 2 (readable from the spawn camera) and arrows
 * on the first tiles. Only the start platform collides.
 */
export function buildSpawnArea(root: Folder): void {
	const folder = makeFolder("SpawnArea", root);
	const zone = ZONES[0];
	const tile0 = getStepSurfaceCFrame(0);

	makePart({
		name: "StartPlatform",
		parent: folder,
		size: new Vector3(40, 1, 30),
		cframe: tile0.mul(new CFrame(0, -0.5, 6 + 15)),
		color: rgb(120, 195, 100),
		collide: true,
		studs: true,
	});
	makePart({
		name: "StartPlatformRim",
		parent: folder,
		size: new Vector3(42, 1, 32),
		cframe: tile0.mul(new CFrame(0, -1.5, 6 + 15)),
		color: rgb(120, 105, 90),
	});

	// Title gate over tile 2.
	const gate = getStepSurfaceCFrame(2);
	for (const side of [-1, 1]) {
		makePart({
			name: "WelcomePost",
			parent: folder,
			size: new Vector3(2, 16, 2),
			cframe: gate.mul(new CFrame(side * 11, 8, 0)),
			color: rgb(250, 250, 245),
		});
		makePart({
			name: "WelcomePostGlow",
			parent: folder,
			size: new Vector3(1, 16, 3),
			cframe: gate.mul(new CFrame(side * 11, 8, 0)),
			color: zone.accentColor,
			material: Enum.Material.Neon,
		});
	}
	const sign = makePart({
		name: "WelcomeSign",
		parent: folder,
		size: new Vector3(24, 6, 1),
		cframe: gate.mul(new CFrame(0, 17, 0)),
		color: rgb(32, 52, 44),
	});
	addFaceText(sign, Enum.NormalId.Back, "WAIT UNTIL 100", rgb(255, 255, 255), zone.accentColor);

	// Arrows on the first tiles, between the step number and the next tile.
	for (let step = 0; step <= 4; step++) {
		buildArrow(folder, getStepSurfaceCFrame(step), 3.8, zone.accentColor);
	}
}
