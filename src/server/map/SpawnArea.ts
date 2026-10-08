import { ZONES } from "shared/config/MapConfig";
import { getStepSurfaceCFrame } from "shared/util/PathUtil";
import { addFaceText, makeFolder, makePart } from "./MapBuilders";

const rgb = (r: number, g: number, b: number): Color3 => Color3.fromRGB(r, g, b);

/** Chevron "^" lying flat on a tile, pointing along the path. */
function buildChevron(parent: Instance, tile: CFrame, ahead: number, color: Color3): void {
	const bars: [Vector3, Vector3][] = [
		[new Vector3(-1.6, 0, 1.2), new Vector3(0, 0, -1)],
		[new Vector3(1.6, 0, 1.2), new Vector3(0, 0, -1)],
	];
	for (const [tail, tip] of bars) {
		const from = new Vector3(tail.X, 0.12, -ahead + tail.Z);
		const to = new Vector3(tip.X, 0.12, -ahead + tip.Z);
		const length = to.sub(from).Magnitude;
		const centre = from.Lerp(to, 0.5);
		makePart({
			name: "Chevron",
			parent,
			size: new Vector3(0.6, 0.15, length),
			cframe: tile.mul(CFrame.lookAt(centre, to)),
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
		material: Enum.Material.Grass,
		collide: true,
	});
	makePart({
		name: "StartPlatformRim",
		parent: folder,
		size: new Vector3(41, 0.6, 31),
		cframe: tile0.mul(new CFrame(0, -1.3, 6 + 15)),
		color: rgb(120, 105, 90),
		material: Enum.Material.Slate,
	});

	// Title gate over tile 2.
	const gate = getStepSurfaceCFrame(2);
	for (const side of [-1, 1]) {
		makePart({
			name: "WelcomePost",
			parent: folder,
			size: new Vector3(1.8, 16, 1.8),
			cframe: gate.mul(new CFrame(side * 11, 8, 0)),
			color: rgb(250, 250, 245),
		});
		makePart({
			name: "WelcomePostGlow",
			parent: folder,
			size: new Vector3(0.6, 16, 2),
			cframe: gate.mul(new CFrame(side * 11, 8, 0)),
			color: zone.accentColor,
			material: Enum.Material.Neon,
		});
	}
	const sign = makePart({
		name: "WelcomeSign",
		parent: folder,
		size: new Vector3(24, 5.5, 1),
		cframe: gate.mul(new CFrame(0, 16.5, 0)),
		color: rgb(32, 52, 44),
	});
	addFaceText(sign, Enum.NormalId.Back, "WAIT UNTIL 100", rgb(255, 255, 255), zone.accentColor);

	// Arrows on the first tiles, between the step number and the next tile.
	for (let step = 0; step <= 4; step++) {
		buildChevron(folder, getStepSurfaceCFrame(step), 4.4, zone.accentColor);
	}
}
