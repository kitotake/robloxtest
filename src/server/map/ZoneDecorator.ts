import { GameConfig } from "shared/config/GameConfig";
import { ZONES, ZoneDef, ZoneId } from "shared/config/MapConfig";
import { getStepSurfaceCFrame, getTileWidth } from "shared/util/PathUtil";
import {
	addFaceText,
	addGlowStrip,
	makeBolt,
	makeCloud,
	makeCube,
	makeFolder,
	makeFrame,
	makeIsland,
	makePart,
	makePillar,
	makeRock,
	makeTree,
	studs,
} from "./MapBuilders";

const { MAX_STEP } = GameConfig;

interface DecorContext {
	folder: Folder;
	zone: ZoneDef;
	step: number;
	/** -1 (left) or +1 (right): alternates so both sides get scenery. */
	side: number;
	rng: Random;
}

/** World position at (lateral, up, ahead) relative to the surface of a tile. */
function place(step: number, lateral: number, up: number, ahead = 0): Vector3 {
	return getStepSurfaceCFrame(step).PointToWorldSpace(new Vector3(lateral, up, -ahead));
}

const rgb = (r: number, g: number, b: number): Color3 => Color3.fromRGB(r, g, b);

/** Dark square pylon with a neon strip showing on its front and back (Neon / Void). */
function glowPylon(parent: Instance, base: Vector3, height: number, bodyColor: Color3, glow: Color3): void {
	const h = studs(height, 4);
	const centre = base.add(new Vector3(0, h / 2, 0));
	makePart({ name: "PylonBody", parent, size: new Vector3(4, h, 4), cframe: new CFrame(centre), color: bodyColor });
	makePart({
		name: "PylonGlow",
		parent,
		size: new Vector3(2, h, 6),
		cframe: new CFrame(centre),
		color: glow,
		material: Enum.Material.Neon,
	});
	makeCube(parent, "PylonCap", base.add(new Vector3(0, h + 2, 0)), 4, glow, Enum.Material.Neon);
}

// ---------------------------------------------------------------- BEGINNING
function decorateBeginning(c: DecorContext): void {
	const top = place(c.step, c.side * c.rng.NextNumber(24, 34), c.rng.NextNumber(-8, -3));
	const diameter = c.rng.NextNumber(14, 20);
	makeIsland(c.folder, top, diameter, rgb(110, 190, 90), rgb(120, 105, 90));
	makeTree(c.folder, top, 6, rgb(80, 175, 80));
}

// --------------------------------------------------------------------- SKY
function decorateSky(c: DecorContext): void {
	const center = place(c.step, c.side * c.rng.NextNumber(26, 50), c.rng.NextNumber(-14, 10));
	makeCloud(c.folder, center, c.rng.NextNumber(0.9, 1.5), rgb(255, 255, 255));
	if (c.step % 3 === 0) {
		const top = place(c.step, -c.side * c.rng.NextNumber(40, 60), c.rng.NextNumber(-20, -6));
		makeIsland(c.folder, top, c.rng.NextNumber(18, 26), rgb(130, 205, 120), rgb(150, 150, 165));
	}
}

// -------------------------------------------------------------------- NEON
function decorateNeon(c: DecorContext): void {
	const height = c.rng.NextNumber(30, 60);
	const glow = c.step % 4 < 2 ? c.zone.accentColor : rgb(190, 90, 255);
	const base = place(c.step, c.side * c.rng.NextNumber(20, 28), -22);
	glowPylon(c.folder, base, height, rgb(24, 24, 48), glow);

	if (c.step % 5 === 0) {
		// Large neon frame floating beside the path, facing it.
		const centre = place(c.step, -c.side * 36, 16);
		makeFrame(c.folder, getStepSurfaceCFrame(c.step), centre, 7, 1, glow, Enum.Material.Neon, "vertical", 0, "FrameBar");
	}
}

// ------------------------------------------------------------------- STORM
function decorateStorm(c: DecorContext): void {
	const dark = rgb(52, 58, 72);
	const centre = place(c.step, c.side * c.rng.NextNumber(40, 70), c.rng.NextNumber(-20, 25));
	const scale = c.rng.NextNumber(24, 40) / 16;
	makeCloud(c.folder, centre, scale, dark, 0.05);
	makeCloud(c.folder, centre.add(new Vector3(scale * 8, -3, 4)), scale * 0.6, rgb(40, 45, 58), 0);

	if (c.step % 5 === 0) {
		// Static lightning bolt: a zig-zag of thin neon bars hanging from the cloud.
		makeBolt(c.folder, centre.sub(new Vector3(0, scale * 2, 0)), c.rng, rgb(215, 230, 255));
	}
}

// ------------------------------------------------------------------ DANGER
function decorateDanger(c: DecorContext): void {
	const size = c.rng.NextNumber(8, 16);
	const centre = place(c.step, c.side * c.rng.NextNumber(24, 40), c.rng.NextNumber(-10, 16));
	const rock = makeRock(c.folder, centre, size, rgb(48, 32, 30), Enum.Material.Plastic, c.rng);
	addGlowStrip(rock, rgb(255, 100, 20));

	if (c.step === 62) {
		// A single distant volcano as the zone landmark: three stacked tiers.
		const base = place(c.step, c.side * 120, -70);
		makePillar(c.folder, "VolcanoBase", base, 50, 90, rgb(55, 36, 32));
		makePillar(c.folder, "VolcanoMid", base.add(new Vector3(0, 50, 0)), 40, 48, rgb(62, 40, 34));
		makePillar(c.folder, "VolcanoLava", base.add(new Vector3(0, 90, 0)), 6, 22, rgb(255, 110, 20), Enum.Material.Neon);
	}
}

// -------------------------------------------------------------------- VOID
function decorateVoid(c: DecorContext): void {
	const size = c.rng.NextNumber(6, 14);
	const centre = place(c.step, c.side * c.rng.NextNumber(28, 50), c.rng.NextNumber(-20, 25));
	glowPylon(c.folder, centre, size * 1.4, rgb(28, 22, 50), c.zone.accentColor);

	if (c.step === 74 || c.step === 79 || c.step === 84) {
		// Large dark structures far away, only readable as silhouettes with a violet glow.
		const height = studs(c.rng.NextNumber(70, 120));
		const base = place(c.step, -c.side * c.rng.NextNumber(90, 130), -40);
		makePillar(c.folder, "DistantMonolith", base, height, 18, rgb(18, 14, 34));
		makePart({
			name: "DistantMonolithRing",
			parent: c.folder,
			size: new Vector3(20, 2, 20),
			cframe: new CFrame(base.add(new Vector3(0, height * 0.7, 0))),
			color: c.zone.accentColor,
			material: Enum.Material.Neon,
		});
	}
}

// ---------------------------------------------------------- FINAL APPROACH
function decorateFinalApproach(c: DecorContext): void {
	if (c.step % 2 !== 0) return;
	const marble = rgb(250, 244, 232);
	const gold = c.zone.accentColor;
	const offset = getTileWidth(c.step) / 2 + 7;
	for (const side of [-1, 1]) {
		const base = place(c.step, side * offset, -4);
		makePart({
			name: "ColumnBase",
			parent: c.folder,
			size: new Vector3(6, 1, 6),
			cframe: new CFrame(base.add(new Vector3(0, 0.5, 0))),
			color: marble,
		});
		makePillar(c.folder, "Column", base.add(new Vector3(0, 1, 0)), 20, 4, marble);
		makePart({
			name: "ColumnCap",
			parent: c.folder,
			size: new Vector3(6, 1, 6),
			cframe: new CFrame(base.add(new Vector3(0, 21.5, 0))),
			color: gold,
			material: Enum.Material.Neon,
		});
	}

	if (c.step === 90 || c.step === 95) {
		// Tall golden towers far off the path: the end of the journey is getting closer.
		const base = place(c.step, c.side * 110, -50);
		makePillar(c.folder, "FarTower", base, 160, 14, rgb(255, 238, 190));
		makePillar(c.folder, "FarTowerGlow", base.add(new Vector3(0, 160, 0)), 10, 16, gold, Enum.Material.Neon);
	}
}

const DECORATORS: Partial<Record<ZoneId, (c: DecorContext) => void>> = {
	Beginning: decorateBeginning,
	Sky: decorateSky,
	Neon: decorateNeon,
	Storm: decorateStorm,
	Danger: decorateDanger,
	Void: decorateVoid,
	FinalApproach: decorateFinalApproach,
};

/** One decoration cluster every N steps, per zone (keeps the part count low). */
const DECOR_EVERY: Partial<Record<ZoneId, number>> = {
	Beginning: 1,
	Sky: 2,
	Neon: 2,
	Storm: 2,
	Danger: 2,
	Void: 2,
	FinalApproach: 1,
};

/** Zone transition: a gate across the path (two posts with a neon strip and a name board). */
function buildZoneGate(parent: Folder, zone: ZoneDef): void {
	const step = zone.fromStep;
	const half = getTileWidth(step) / 2 + 2;
	const base = getStepSurfaceCFrame(step);
	const gateCFrame = (x: number, y: number): CFrame =>
		new CFrame(base.PointToWorldSpace(new Vector3(x, y, 0))).mul(base.Rotation);

	for (const side of [-1, 1]) {
		makePart({
			name: "GatePost",
			parent,
			size: new Vector3(2, 14, 2),
			cframe: gateCFrame(side * half, 7),
			color: rgb(40, 40, 52),
		});
		makePart({
			name: "GatePostGlow",
			parent,
			size: new Vector3(1, 14, 3),
			cframe: gateCFrame(side * half, 7),
			color: zone.accentColor,
			material: Enum.Material.Neon,
		});
	}
	const board = makePart({
		name: `Gate_${zone.id}`,
		parent,
		size: new Vector3(studs(half * 2 + 2), 5, 1),
		cframe: gateCFrame(0, 14.5),
		color: rgb(26, 28, 40),
	});
	board.SetAttribute("Zone", zone.id);
	addFaceText(board, Enum.NormalId.Back, zone.displayName, zone.accentColor);
}

/**
 * Builds the scenery of every zone. Everything is non-colliding and lives in
 * MapDecor/Zone_<id>, so a zone's decoration can be hidden or destroyed alone.
 */
export function buildZoneDecor(root: Folder): void {
	const gates = makeFolder("ZoneGates", root);

	for (const zone of ZONES) {
		if (zone.fromStep > 0 && zone.id !== "Final") buildZoneGate(gates, zone);

		const decorate = DECORATORS[zone.id];
		if (decorate === undefined) continue;
		const folder = makeFolder(`Zone_${zone.id}`, root);
		const every = DECOR_EVERY[zone.id] ?? 2;

		for (let step = math.max(zone.fromStep, 1); step <= math.min(zone.toStep, MAX_STEP - 1); step++) {
			if ((step - zone.fromStep) % every !== 0 && zone.id !== "FinalApproach") continue;
			const side = (step - zone.fromStep) % (every * 2) < every ? -1 : 1;
			decorate({ folder, zone, step, side, rng: new Random(1000 + step) });
		}
	}
}
