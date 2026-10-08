import { GameConfig } from "shared/config/GameConfig";
import { MapConfig, ZONES, ZoneDef, ZoneId } from "shared/config/MapConfig";
import { getStepSurfaceCFrame, getTileWidth } from "shared/util/PathUtil";
import { addFaceText, makeBall, makeCloud, makeFolder, makeIsland, makePart, makePillar } from "./MapBuilders";

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

function randomRotation(rng: Random): CFrame {
	return CFrame.Angles(rng.NextNumber(0, math.pi), rng.NextNumber(0, math.pi), rng.NextNumber(0, math.pi));
}

const rgb = (r: number, g: number, b: number): Color3 => Color3.fromRGB(r, g, b);

// ---------------------------------------------------------------- BEGINNING
function decorateBeginning(c: DecorContext): void {
	const top = place(c.step, c.side * c.rng.NextNumber(24, 34), c.rng.NextNumber(-8, -3));
	const diameter = c.rng.NextNumber(14, 20);
	makeIsland(c.folder, top, diameter, rgb(110, 190, 90), rgb(120, 105, 90));
	makePillar(c.folder, "Trunk", top, 6, 1.2, rgb(120, 85, 55), Enum.Material.Wood);
	makeBall(c.folder, "Leaves", top.add(new Vector3(0, 8, 0)), 7, rgb(80, 175, 80), Enum.Material.Grass);
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
	makePart({
		name: "PylonBody",
		parent: c.folder,
		size: new Vector3(2.6, height, 2.6),
		cframe: new CFrame(base.add(new Vector3(0, height / 2, 0))),
		color: rgb(24, 24, 48),
	});
	makePart({
		name: "PylonGlow",
		parent: c.folder,
		size: new Vector3(0.7, height, 2.8),
		cframe: new CFrame(base.add(new Vector3(0, height / 2, 0))),
		color: glow,
		material: Enum.Material.Neon,
	});
	makeBall(c.folder, "PylonCap", base.add(new Vector3(0, height + 1.5, 0)), 3.5, glow, Enum.Material.Neon);

	if (c.step % 5 === 0) {
		// Large neon frame floating beside the path, facing it.
		const centre = place(c.step, -c.side * 36, 16);
		const frame = getStepSurfaceCFrame(c.step).Rotation.add(centre);
		const bar = (size: Vector3, offset: Vector3): void => {
			makePart({
				name: "FrameBar",
				parent: c.folder,
				size,
				cframe: new CFrame(frame.PointToWorldSpace(offset)).mul(getStepSurfaceCFrame(c.step).Rotation),
				color: glow,
				material: Enum.Material.Neon,
			});
		};
		bar(new Vector3(14, 1, 1), new Vector3(0, 7, 0));
		bar(new Vector3(14, 1, 1), new Vector3(0, -7, 0));
		bar(new Vector3(1, 14, 1), new Vector3(7, 0, 0));
		bar(new Vector3(1, 14, 1), new Vector3(-7, 0, 0));
	}
}

// ------------------------------------------------------------------- STORM
function decorateStorm(c: DecorContext): void {
	const dark = rgb(52, 58, 72);
	const centre = place(c.step, c.side * c.rng.NextNumber(40, 70), c.rng.NextNumber(-20, 25));
	const diameter = c.rng.NextNumber(24, 40);
	makeBall(c.folder, "StormCloud", centre, diameter, dark, undefined, 0.05);
	makeBall(c.folder, "StormCloud", centre.add(new Vector3(diameter * 0.5, -3, 4)), diameter * 0.7, rgb(40, 45, 58));

	if (c.step % 5 === 0) {
		// Static lightning bolt: a zig-zag of thin neon segments hanging from the cloud.
		let from = centre.sub(new Vector3(0, diameter * 0.45, 0));
		for (let i = 0; i < 4; i++) {
			const to = from.add(
				new Vector3(c.rng.NextNumber(-5, 5), -c.rng.NextNumber(9, 13), c.rng.NextNumber(-5, 5)),
			);
			const mid = from.Lerp(to, 0.5);
			makePart({
				name: "Bolt",
				parent: c.folder,
				size: new Vector3(0.8, 0.8, to.sub(from).Magnitude),
				cframe: CFrame.lookAt(mid, to),
				color: rgb(215, 230, 255),
				material: Enum.Material.Neon,
			});
			from = to;
		}
	}
}

// ------------------------------------------------------------------ DANGER
function decorateDanger(c: DecorContext): void {
	const size = c.rng.NextNumber(8, 16);
	const centre = place(c.step, c.side * c.rng.NextNumber(24, 40), c.rng.NextNumber(-10, 16));
	const rotation = randomRotation(c.rng);
	makePart({
		name: "FloatingRock",
		parent: c.folder,
		size: new Vector3(size, size * 0.8, size * 0.9),
		cframe: new CFrame(centre).mul(rotation),
		color: rgb(48, 32, 30),
		material: Enum.Material.Basalt,
	});
	makePart({
		name: "LavaCrack",
		parent: c.folder,
		size: new Vector3(size * 0.1, size * 0.6, size * 0.7),
		cframe: new CFrame(centre).mul(rotation).mul(new CFrame(size * 0.5, 0, 0)),
		color: rgb(255, 100, 20),
		material: Enum.Material.Neon,
	});

	if (c.step === 62) {
		// A single distant volcano as the zone landmark.
		const base = place(c.step, c.side * 120, -70);
		makePillar(c.folder, "VolcanoBase", base, 50, 90, rgb(55, 36, 32), Enum.Material.Basalt);
		makePillar(
			c.folder,
			"VolcanoMid",
			base.add(new Vector3(0, 50, 0)),
			40,
			48,
			rgb(62, 40, 34),
			Enum.Material.Basalt,
		);
		makePillar(
			c.folder,
			"VolcanoLava",
			base.add(new Vector3(0, 90, 0)),
			6,
			22,
			rgb(255, 110, 20),
			Enum.Material.Neon,
		);
	}
}

// -------------------------------------------------------------------- VOID
function decorateVoid(c: DecorContext): void {
	const size = c.rng.NextNumber(6, 14);
	const centre = place(c.step, c.side * c.rng.NextNumber(28, 50), c.rng.NextNumber(-20, 25));
	const rotation = randomRotation(c.rng);
	makePart({
		name: "Shard",
		parent: c.folder,
		size: new Vector3(size * 0.5, size * 1.4, size * 0.5),
		cframe: new CFrame(centre).mul(rotation),
		color: rgb(28, 22, 50),
		material: Enum.Material.Glass,
	});
	makePart({
		name: "ShardCore",
		parent: c.folder,
		size: new Vector3(size * 0.15, size * 0.9, size * 0.15),
		cframe: new CFrame(centre).mul(rotation),
		color: c.zone.accentColor,
		material: Enum.Material.Neon,
	});

	if (c.step === 74 || c.step === 79 || c.step === 84) {
		// Large dark structures far away, only readable as silhouettes with a violet glow.
		const height = c.rng.NextNumber(70, 120);
		const base = place(c.step, -c.side * c.rng.NextNumber(90, 130), -40);
		makePart({
			name: "DistantMonolith",
			parent: c.folder,
			size: new Vector3(18, height, 18),
			cframe: new CFrame(base.add(new Vector3(0, height / 2, 0))),
			color: rgb(18, 14, 34),
		});
		makePart({
			name: "DistantMonolithRing",
			parent: c.folder,
			size: new Vector3(19, 2, 19),
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
			size: new Vector3(5, 1.2, 5),
			cframe: new CFrame(base.add(new Vector3(0, 0.6, 0))),
			color: marble,
			material: Enum.Material.Marble,
		});
		makePillar(c.folder, "Column", base.add(new Vector3(0, 1.2, 0)), 20, 3, marble, Enum.Material.Marble);
		makePart({
			name: "ColumnCap",
			parent: c.folder,
			size: new Vector3(5, 1.2, 5),
			cframe: new CFrame(base.add(new Vector3(0, 21.8, 0))),
			color: gold,
			material: Enum.Material.Neon,
		});
	}

	if (c.step === 90 || c.step === 95) {
		// Tall golden towers far off the path: the end of the journey is getting closer.
		const base = place(c.step, c.side * 110, -50);
		makePillar(c.folder, "FarTower", base, 160, 14, rgb(255, 238, 190), Enum.Material.Marble);
		makePillar(c.folder, "FarTowerGlow", base.add(new Vector3(0, 160, 0)), 10, 15, gold, Enum.Material.Neon);
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
			size: new Vector3(1.6, 14, 1.6),
			cframe: gateCFrame(side * half, 7),
			color: rgb(40, 40, 52),
		});
		makePart({
			name: "GatePostGlow",
			parent,
			size: new Vector3(0.5, 14, 1.8),
			cframe: gateCFrame(side * half, 7),
			color: zone.accentColor,
			material: Enum.Material.Neon,
		});
	}
	const board = makePart({
		name: `Gate_${zone.id}`,
		parent,
		size: new Vector3(half * 2 + 2, 4.5, 1),
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
