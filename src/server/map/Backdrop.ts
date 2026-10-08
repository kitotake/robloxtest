import { MapConfig, ZONES, ZONE_DENSITY, ZoneDef, ZoneId } from "shared/config/MapConfig";
import { getStepSurfaceCFrame } from "shared/util/PathUtil";
import { makeBall, makeCloud, makeColumn, makeFolder, makeIsland, makePart, makePillar, makeRing } from "./MapBuilders";
import { Layer, place, rgb, seeded } from "./PathFrame";

interface BackdropContext {
	parent: Folder;
	zone: ZoneDef;
	/** Tile the piece is anchored to. */
	step: number;
	/** -1 / +1 */
	side: number;
	/** Distant centre of the piece (already far from the path). */
	centre: Vector3;
	rng: Random;
	index: number;
}

function tree(parent: Instance, top: Vector3, height: number, leaf: Color3): void {
	makePillar(parent, "Trunk", top, height, 1.6, rgb(115, 82, 52), Enum.Material.Wood);
	makeBall(parent, "Leaves", top.add(new Vector3(0, height + 2, 0)), height * 1.2, leaf, Enum.Material.Grass);
}

/** Ruined arch: two columns, a broken lintel and a fallen block. */
function ruinArch(parent: Instance, base: Vector3, scale: number, color: Color3, glow: Color3, frame: CFrame): void {
	for (const side of [-1, 1]) {
		const bottom = base.add(frame.PointToWorldSpace(new Vector3(side * 7 * scale, 0, 0)).sub(frame.Position));
		makePillar(parent, "RuinColumn", bottom, (side < 0 ? 22 : 15) * scale, 3 * scale, color, Enum.Material.Slate);
	}
	makePart({
		name: "RuinLintel",
		parent,
		size: new Vector3(10 * scale, 2.4 * scale, 3 * scale),
		cframe: new CFrame(base.add(new Vector3(0, 22.5 * scale, 0)))
			.mul(frame.Rotation)
			.mul(CFrame.Angles(0, 0, 0.12)),
		color,
		material: Enum.Material.Slate,
	});
	makeBall(parent, "RuinGlow", base.add(new Vector3(0, 12 * scale, 0)), 3 * scale, glow, Enum.Material.Neon, 0.2);
}

// ---- Beginning
function backBeginning(c: BackdropContext): void {
	const diameter = c.rng.NextNumber(40, 70);
	const top = c.centre;
	makeIsland(c.parent, top, diameter, rgb(115, 195, 95), rgb(125, 110, 95));
	for (let i = 0; i < 4; i++) {
		const angle = c.rng.NextNumber(0, 2 * math.pi);
		const dist = c.rng.NextNumber(0, diameter * 0.33);
		tree(
			c.parent,
			top.add(new Vector3(math.cos(angle) * dist, 0, math.sin(angle) * dist)),
			c.rng.NextNumber(7, 12),
			rgb(80, 170, 80),
		);
	}
}

// ---- Sky
function backSky(c: BackdropContext): void {
	if (c.index % 2 === 0) {
		makeCloud(c.parent, c.centre, c.rng.NextNumber(3, 5), rgb(255, 255, 255), 0.12);
		makeCloud(c.parent, c.centre.add(new Vector3(40, -12, 20)), c.rng.NextNumber(2, 3.5), rgb(245, 250, 255), 0.12);
	} else {
		const diameter = c.rng.NextNumber(30, 46);
		makeIsland(c.parent, c.centre, diameter, rgb(130, 205, 120), rgb(150, 150, 165));
		// Waterfall pouring off the island (a long translucent column).
		makePillar(
			c.parent,
			"Waterfall",
			c.centre.sub(new Vector3(diameter * 0.25, 95, 0)),
			80,
			5,
			rgb(150, 210, 255),
			Enum.Material.Glass,
			0.45,
		);
		tree(c.parent, c.centre.add(new Vector3(-4, 0, 3)), 8, rgb(90, 180, 90));
	}
}

// ---- Neon
function backNeon(c: BackdropContext): void {
	if (c.index % 3 === 2) {
		const frame = getStepSurfaceCFrame(c.step);
		makeRing(
			c.parent,
			frame,
			c.centre,
			c.rng.NextNumber(22, 32),
			28,
			2.4,
			c.index % 2 === 0 ? c.zone.accentColor : rgb(190, 90, 255),
			Enum.Material.Neon,
		);
		return;
	}
	// Skyline: a cluster of towers with neon bands.
	for (let i = 0; i < 4; i++) {
		const height = c.rng.NextNumber(50, 130);
		const base = c.centre.add(new Vector3(i * 16 - 24, -90, c.rng.NextNumber(-10, 10)));
		const glow = i % 2 === 0 ? c.zone.accentColor : rgb(190, 90, 255);
		makePart({
			name: "Tower",
			parent: c.parent,
			size: new Vector3(11, height, 11),
			cframe: new CFrame(base.add(new Vector3(0, height / 2, 0))),
			color: rgb(22, 22, 46),
		});
		makePart({
			name: "TowerBand",
			parent: c.parent,
			size: new Vector3(11.6, 2, 11.6),
			cframe: new CFrame(base.add(new Vector3(0, height * 0.6, 0))),
			color: glow,
			material: Enum.Material.Neon,
		});
		makePart({
			name: "TowerTop",
			parent: c.parent,
			size: new Vector3(11.6, 1.4, 11.6),
			cframe: new CFrame(base.add(new Vector3(0, height, 0))),
			color: glow,
			material: Enum.Material.Neon,
		});
	}
}

// ---- Storm
function backStorm(c: BackdropContext): void {
	if (c.index % 2 === 0) {
		// Wall of storm clouds.
		for (let i = 0; i < 5; i++) {
			const d = c.rng.NextNumber(55, 90);
			makeBall(
				c.parent,
				"StormWall",
				c.centre.add(new Vector3(i * 38 - 76, c.rng.NextNumber(-10, 18), c.rng.NextNumber(-20, 20))),
				d,
				rgb(46, 52, 66),
				undefined,
				0.05,
			);
		}
	} else {
		// Dark rock spire crowned with a storm crystal.
		const height = c.rng.NextNumber(80, 140);
		const base = c.centre.sub(new Vector3(0, 100, 0));
		makePillar(c.parent, "Spire", base, height, 16, rgb(48, 54, 68), Enum.Material.Slate);
		makePillar(
			c.parent,
			"SpireTip",
			base.add(new Vector3(0, height, 0)),
			22,
			7,
			rgb(60, 66, 82),
			Enum.Material.Slate,
		);
		makeBall(
			c.parent,
			"SpireGlow",
			base.add(new Vector3(0, height + 24, 0)),
			7,
			rgb(215, 230, 255),
			Enum.Material.Neon,
		);
	}
}

// ---- Danger
function backDanger(c: BackdropContext): void {
	if (c.index === 1) {
		const base = c.centre.sub(new Vector3(0, 120, 0));
		makePillar(c.parent, "VolcanoBase", base, 70, 120, rgb(55, 36, 32), Enum.Material.Basalt);
		makePillar(
			c.parent,
			"VolcanoMid",
			base.add(new Vector3(0, 70, 0)),
			55,
			66,
			rgb(62, 40, 34),
			Enum.Material.Basalt,
		);
		makePillar(
			c.parent,
			"VolcanoLava",
			base.add(new Vector3(0, 125, 0)),
			8,
			30,
			rgb(255, 110, 20),
			Enum.Material.Neon,
		);
		return;
	}
	const diameter = c.rng.NextNumber(30, 50);
	makePart({
		name: "LavaIsland",
		parent: c.parent,
		size: new Vector3(diameter, diameter * 0.6, diameter),
		cframe: new CFrame(c.centre),
		color: rgb(48, 32, 30),
		material: Enum.Material.Basalt,
		shape: Enum.PartType.Ball,
	});
	makePillar(
		c.parent,
		"LavaFall",
		c.centre.sub(new Vector3(0, 110, 0)),
		100,
		4,
		rgb(255, 100, 20),
		Enum.Material.Neon,
		0.1,
	);
	makeBall(
		c.parent,
		"LavaPool",
		c.centre.add(new Vector3(0, diameter * 0.28, 0)),
		diameter * 0.4,
		rgb(255, 110, 25),
		Enum.Material.Neon,
		0.1,
	);
}

// ---- Void
function backVoid(c: BackdropContext): void {
	const frame = getStepSurfaceCFrame(c.step);
	if (c.index === 1 || c.index === 5) {
		// Ringed planet.
		const d = c.rng.NextNumber(110, 160);
		makeBall(c.parent, "Planet", c.centre, d, rgb(38, 28, 70), Enum.Material.SmoothPlastic);
		makeRing(
			c.parent,
			frame.mul(CFrame.Angles(0.35, 0, 0.2)),
			c.centre,
			d * 0.85,
			30,
			2,
			rgb(170, 110, 255),
			Enum.Material.Neon,
			"flat",
			0.35,
			"PlanetRing",
		);
		return;
	}
	if (c.index % 2 === 0) {
		ruinArch(c.parent, c.centre, c.rng.NextNumber(1.2, 1.8), rgb(40, 34, 64), c.zone.accentColor, frame);
		return;
	}
	for (let i = 0; i < 3; i++) {
		const size = c.rng.NextNumber(10, 22);
		makePart({
			name: "VoidShard",
			parent: c.parent,
			size: new Vector3(size * 0.4, size * 1.6, size * 0.4),
			cframe: new CFrame(
				c.centre.add(new Vector3(i * 22 - 22, c.rng.NextNumber(-12, 12), c.rng.NextNumber(-12, 12))),
			).mul(CFrame.Angles(c.rng.NextNumber(0, math.pi), 0, c.rng.NextNumber(0, math.pi))),
			color: rgb(30, 24, 54),
			material: Enum.Material.Glass,
		});
		makeBall(
			c.parent,
			"VoidCore",
			c.centre.add(new Vector3(i * 22 - 22, 0, 0)),
			3,
			c.zone.accentColor,
			Enum.Material.Neon,
		);
	}
}

// ---- Final approach
function backFinalApproach(c: BackdropContext): void {
	const diameter = c.rng.NextNumber(34, 50);
	makeIsland(c.parent, c.centre, diameter, rgb(255, 240, 200), rgb(225, 205, 160));
	for (let i = 0; i < 4; i++) {
		const angle = (i / 4) * 2 * math.pi;
		makeColumn(
			c.parent,
			c.centre.add(new Vector3(math.cos(angle) * 10, 0, math.sin(angle) * 10)),
			14,
			2,
			rgb(250, 244, 232),
			c.zone.accentColor,
		);
	}
	makeBall(c.parent, "GoldCore", c.centre.add(new Vector3(0, 7, 0)), 5, c.zone.accentColor, Enum.Material.Neon);
	makePillar(c.parent, "Beam", c.centre, 260, 2.4, rgb(255, 225, 140), Enum.Material.Neon, 0.75);
}

const BACKDROPS: Partial<Record<ZoneId, (c: BackdropContext) => void>> = {
	Beginning: backBeginning,
	Sky: backSky,
	Neon: backNeon,
	Storm: backStorm,
	Danger: backDanger,
	Void: backVoid,
	FinalApproach: backFinalApproach,
};

/** Vertical position of the distant pieces relative to the local tile (some above, some below the path). */
const UP_RANGE: Partial<Record<ZoneId, [number, number]>> = {
	Beginning: [-30, 20],
	Sky: [-40, 60],
	Neon: [20, 90],
	Storm: [10, 70],
	Danger: [-20, 60],
	Void: [10, 110],
	FinalApproach: [-10, 60],
};

/**
 * Big distant scenery, spread evenly over each zone and kept far from the
 * path (never on it, never blocking the view along it). Alternates left /
 * right and is seeded, so every server builds the same skyline.
 */
export function buildBackdrop(root: Folder): void {
	const folder = makeFolder("Backdrop", root);
	for (const zone of ZONES) {
		const make = BACKDROPS[zone.id];
		if (make === undefined) continue;
		const count = math.round(ZONE_DENSITY[zone.id].backdropCount * MapConfig.DENSITY_SCALE);
		const span = zone.toStep - zone.fromStep;
		const parent = makeFolder(`Backdrop_${zone.id}`, folder);
		const [upMin, upMax] = UP_RANGE[zone.id] ?? [0, 40];
		// Keep the last approach pieces well away from the final platform.
		const minLateral = zone.id === "FinalApproach" ? 115 : 90;

		for (let i = 0; i < count; i++) {
			const step = math.clamp(zone.fromStep + math.floor(((i + 0.5) / count) * span), 1, 99);
			const rng = seeded(Layer.Backdrop, step * 10 + i);
			const side = i % 2 === 0 ? -1 : 1;
			const centre = place(
				step,
				side * rng.NextNumber(minLateral, minLateral + 120),
				rng.NextNumber(upMin, upMax),
				rng.NextNumber(-10, 40),
			);
			make({ parent, zone, step, side, centre, rng, index: i });
		}
	}
}
