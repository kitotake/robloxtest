import { GameConfig } from "shared/config/GameConfig";
import { MapConfig, ZONES, ZONE_DENSITY, ZoneDef, ZoneId } from "shared/config/MapConfig";
import { getTileWidth } from "shared/util/PathUtil";
import {
	addGlowStrip,
	makeCloud,
	makeCrystalCluster,
	makeCube,
	makeFolder,
	makeIsland,
	makePart,
	makePillar,
	makeRock,
} from "./MapBuilders";
import { Layer, place, rgb, seeded } from "./PathFrame";

const { MAX_STEP } = GameConfig;

interface PropContext {
	parent: Folder;
	zone: ZoneDef;
	step: number;
	side: number;
	rng: Random;
	/** Lateral distance from the path axis of the first free stud. */
	edge: number;
}

const FLOWERS = [rgb(255, 150, 190), rgb(255, 230, 120), rgb(255, 255, 255), rgb(170, 200, 255)];

function propBeginning(c: PropContext): void {
	const top = place(c.step, c.side * (c.edge + c.rng.NextNumber(5, 12)), c.rng.NextNumber(-5, -1));
	makeIsland(c.parent, top, c.rng.NextNumber(6, 8), rgb(120, 200, 100), rgb(125, 110, 95));
	for (let i = 0; i < 3; i++) {
		const offset = new Vector3(c.rng.NextInteger(-2, 2), 0.5, c.rng.NextInteger(-2, 2));
		makeCube(c.parent, "Flower", top.add(offset), 1, FLOWERS[c.rng.NextInteger(0, FLOWERS.size() - 1)]);
	}
}

function propSky(c: PropContext): void {
	const centre = place(c.step, c.side * (c.edge + c.rng.NextNumber(6, 14)), c.rng.NextNumber(-6, 2));
	makeCloud(c.parent, centre, 0.45, rgb(255, 255, 255), 0.15);
	makeCube(c.parent, "SkyLantern", centre.add(new Vector3(0, 4, 0)), 1, rgb(255, 255, 245), Enum.Material.Neon);
}

function propNeon(c: PropContext): void {
	const color = c.step % 2 === 0 ? c.zone.accentColor : rgb(190, 90, 255);
	const base = place(c.step, c.side * (c.edge + c.rng.NextNumber(4, 10)), c.rng.NextNumber(-4, 0));
	makeRock(c.parent, base, 4, rgb(26, 26, 52), Enum.Material.Plastic, c.rng);
	makeCrystalCluster(c.parent, base.add(new Vector3(0, 2, 0)), 1, color, c.rng);
}

function propStorm(c: PropContext): void {
	const centre = place(c.step, c.side * (c.edge + c.rng.NextNumber(5, 12)), c.rng.NextNumber(-5, 1));
	makeRock(c.parent, centre, c.rng.NextNumber(3, 6), rgb(58, 64, 78), Enum.Material.Plastic, c.rng);
	if (c.step % 3 === 0)
		makeCrystalCluster(c.parent, centre.add(new Vector3(0, 3, 0)), 1, rgb(215, 230, 255), c.rng);
}

function propDanger(c: PropContext): void {
	const centre = place(c.step, c.side * (c.edge + c.rng.NextNumber(5, 12)), c.rng.NextNumber(-5, 1));
	const size = c.rng.NextNumber(3, 6);
	const rock = makeRock(c.parent, centre, size, rgb(52, 34, 30), Enum.Material.Plastic, c.rng);
	addGlowStrip(rock, rgb(255, 100, 20));
	makeCube(c.parent, "Ember", centre.add(new Vector3(0, size * 0.5 + 3, 0)), 1, rgb(255, 140, 40), Enum.Material.Neon);
}

function propVoid(c: PropContext): void {
	const base = place(c.step, c.side * (c.edge + c.rng.NextNumber(5, 12)), c.rng.NextNumber(-4, 3));
	makeCrystalCluster(c.parent, base, 1, c.zone.accentColor, c.rng);
	makePart({
		name: "Shard",
		parent: c.parent,
		size: new Vector3(1, 4, 1),
		cframe: new CFrame(
			base.add(new Vector3(c.rng.NextInteger(-4, 4), c.rng.NextInteger(2, 6), c.rng.NextInteger(-4, 4))),
		),
		color: rgb(30, 24, 52),
	});
}

function propFinalApproach(c: PropContext): void {
	const base = place(c.step, c.side * (c.edge + c.rng.NextNumber(4, 9)), c.rng.NextNumber(-4, 0));
	makePart({
		name: "Pedestal",
		parent: c.parent,
		size: new Vector3(2, 2, 2),
		cframe: new CFrame(base),
		color: rgb(250, 244, 232),
	});
	makeCube(c.parent, "GoldOrb", base.add(new Vector3(0, 2, 0)), 2, c.zone.accentColor, Enum.Material.Neon);
	if (c.step % 3 === 0) makePillar(c.parent, "Taper", base.add(new Vector3(0, 1, 0)), 5, 1, rgb(255, 238, 190));
}

const PROPS: Partial<Record<ZoneId, (c: PropContext) => void>> = {
	Beginning: propBeginning,
	Sky: propSky,
	Neon: propNeon,
	Storm: propStorm,
	Danger: propDanger,
	Void: propVoid,
	FinalApproach: propFinalApproach,
};

/**
 * Small themed props floating right next to the path (a few studs from its
 * edge): they frame the route and make the space around the player feel
 * occupied without ever sitting on the tiles. Deterministic (seeded per step).
 */
export function buildZoneProps(root: Folder): void {
	const folder = makeFolder("Props", root);
	for (const zone of ZONES) {
		const make = PROPS[zone.id];
		if (make === undefined) continue;
		const chance = ZONE_DENSITY[zone.id].propChance * MapConfig.DENSITY_SCALE;
		const parent = makeFolder(`Props_${zone.id}`, folder);
		for (let step = math.max(zone.fromStep, 1); step <= math.min(zone.toStep, MAX_STEP - 1); step++) {
			const rng = seeded(Layer.Props, step);
			for (const side of [-1, 1]) {
				// Always consume the same random numbers so lowering the density never reshuffles the map.
				const roll = rng.NextNumber();
				if (roll > chance) continue;
				make({ parent, zone, step, side, rng, edge: getTileWidth(step) / 2 + 1.5 });
			}
		}
	}
}
