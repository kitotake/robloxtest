import { MapConfig, getZoneForStep } from "shared/config/MapConfig";
import { getStepSurfaceCFrame } from "shared/util/PathUtil";
import {
	addFaceText,
	makeBall,
	makeColumn,
	makeFolder,
	makeIsland,
	makePart,
	makePillar,
	makeRing,
} from "./MapBuilders";
import { facing, place, rgb, seeded, Layer } from "./PathFrame";

const MARBLE = rgb(250, 244, 232);

/** Open arch across the path (it frames the route; the player walks through it). */
function archGate(
	parent: Folder,
	step: number,
	radius: number,
	material: Enum.Material,
	color: Color3,
	glow: Color3,
	label: string,
): void {
	const frame = getStepSurfaceCFrame(step);
	const centre = place(step, 0, radius * 0.4);
	makeRing(parent, frame, centre, radius, 18, 2.6, color, material, "vertical", 0, "ArchRing");
	makeRing(parent, frame, centre, radius - 1.8, 18, 0.7, glow, Enum.Material.Neon, "vertical", 0, "ArchGlow");
	const sign = makePart({
		name: `ArchSign_${step}`,
		parent,
		size: new Vector3(math.max(16, label.size() * 3.2), 6, 1),
		cframe: facing(step, 0, radius * 0.4 + radius + 4),
		color: rgb(24, 26, 38),
	});
	addFaceText(sign, Enum.NormalId.Back, label, glow);
}

function bolt(parent: Instance, top: Vector3, rng: Random): void {
	let from = top;
	for (let i = 0; i < 4; i++) {
		const target = from.add(new Vector3(rng.NextNumber(-5, 5), -rng.NextNumber(9, 13), rng.NextNumber(-5, 5)));
		makePart({
			name: "Bolt",
			parent,
			size: new Vector3(0.9, 0.9, target.sub(from).Magnitude),
			cframe: CFrame.lookAt(from.Lerp(target, 0.5), target),
			color: rgb(215, 230, 255),
			material: Enum.Material.Neon,
		});
		from = target;
	}
}

/** 0 — Start: banners beside the spawn, floating lanterns and a big green island behind it. */
function landmarkStart(parent: Folder): void {
	const zone = getZoneForStep(0);
	const rng = seeded(Layer.Landmarks, 0);
	for (const side of [-1, 1]) {
		const base = place(0, side * 13, -1, 3);
		makePillar(parent, "BannerPole", base, 20, 0.7, rgb(235, 235, 230));
		makeBall(parent, "BannerTip", base.add(new Vector3(0, 20.6, 0)), 1.6, zone.accentColor, Enum.Material.Neon);
		makePart({
			name: "Banner",
			parent,
			size: new Vector3(0.3, 10, 6),
			cframe: facing(0, side * 13 + side * 0.4, 14, 3),
			color: zone.accentColor,
			material: Enum.Material.Fabric,
		});
	}
	for (let i = 0; i < 8; i++) {
		makeBall(
			parent,
			"Lantern",
			place(0, rng.NextNumber(-22, 22), rng.NextNumber(6, 16), rng.NextNumber(-12, 22)),
			1.1,
			rgb(255, 240, 180),
			Enum.Material.Neon,
		);
	}
	const top = place(0, 0, -8, -52);
	makeIsland(parent, top, 46, rgb(115, 195, 95), rgb(125, 110, 95));
	for (const [x, z, h] of [
		[-9, -4, 9],
		[6, 8, 11],
		[10, -9, 8],
	]) {
		makePillar(parent, "Trunk", top.add(new Vector3(x, 0, z)), h, 1.6, rgb(115, 82, 52), Enum.Material.Wood);
		makeBall(parent, "Leaves", top.add(new Vector3(x, h + 2, z)), h * 1.2, rgb(80, 170, 80), Enum.Material.Grass);
	}
}

/** 10 — Green/ivory arch: the first "wow", right before the Sky. */
function landmarkTen(parent: Folder): void {
	const zone = getZoneForStep(10);
	archGate(parent, 10, 20, Enum.Material.Marble, MARBLE, zone.accentColor, "10");
}

/** 25 — Sky temple on a floating island, with a waterfall, and a glass arch over the path. */
function landmarkTwentyFive(parent: Folder): void {
	const zone = getZoneForStep(25);
	archGate(parent, 25, 21, Enum.Material.Glass, rgb(190, 225, 255), zone.accentColor, "25");
	const top = place(25, 62, -10, 10);
	makeIsland(parent, top, 38, rgb(130, 205, 120), rgb(150, 150, 165));
	for (const [x, z] of [
		[-9, -9],
		[9, -9],
		[-9, 9],
		[9, 9],
	]) {
		makeColumn(parent, top.add(new Vector3(x, 0, z)), 14, 2, MARBLE, zone.accentColor);
	}
	makePart({
		name: "TempleRoof",
		parent,
		size: new Vector3(24, 1.8, 24),
		cframe: new CFrame(top.add(new Vector3(0, 15.5, 0))),
		color: MARBLE,
		material: Enum.Material.Marble,
	});
	makeBall(parent, "TempleOrb", top.add(new Vector3(0, 6, 0)), 4, zone.accentColor, Enum.Material.Neon);
	makePillar(
		parent,
		"Waterfall",
		top.sub(new Vector3(14, 100, 0)),
		90,
		6,
		rgb(150, 210, 255),
		Enum.Material.Glass,
		0.45,
	);
}

/** 50 — HALFWAY: sign across the path and a lightning tower in the storm. */
function landmarkFifty(parent: Folder): void {
	const zone = getZoneForStep(50);
	const rng = seeded(Layer.Landmarks, 50);
	archGate(parent, 50, 22, Enum.Material.Slate, rgb(70, 78, 96), zone.accentColor, "HALFWAY");
	const base = place(50, -78, -50, 14);
	makePillar(parent, "TowerBase", base, 40, 28, rgb(52, 58, 72), Enum.Material.Slate);
	makePillar(parent, "TowerMid", base.add(new Vector3(0, 40, 0)), 50, 17, rgb(60, 66, 82), Enum.Material.Slate);
	const tip = base.add(new Vector3(0, 100, 0));
	makeBall(parent, "TowerCore", tip, 13, rgb(215, 230, 255), Enum.Material.Neon);
	bolt(parent, tip.sub(new Vector3(0, 6, 0)), rng);
}

/** 75 — Void: violet arch and a huge floating ring with a glowing core. */
function landmarkSeventyFive(parent: Folder): void {
	const zone = getZoneForStep(75);
	archGate(parent, 75, 22, Enum.Material.Glass, rgb(60, 46, 110), zone.accentColor, "75");
	const frame = getStepSurfaceCFrame(75);
	const centre = place(75, -88, 48, 20);
	makeRing(parent, frame, centre, 30, 28, 3, zone.accentColor, Enum.Material.Neon, "flat", 0.1, "GiantRing");
	makeBall(parent, "GiantCore", centre, 14, rgb(230, 200, 255), Enum.Material.Neon, 0.15);
}

/** 90 — "10 TO GO": golden arch, light beams and spires that already hint at the final area. */
function landmarkNinety(parent: Folder): void {
	const zone = getZoneForStep(90);
	archGate(parent, 90, 22, Enum.Material.Marble, MARBLE, zone.accentColor, "10 TO GO");
	for (const side of [-1, 1]) {
		makePillar(parent, "GoldBeam", place(90, side * 27, -4), 320, 3, rgb(255, 225, 140), Enum.Material.Neon, 0.7);
		const base = place(90, side * 42, -6, 22);
		makePillar(parent, "Spire", base, 70, 5, MARBLE, Enum.Material.Marble);
		makeBall(parent, "SpireOrb", base.add(new Vector3(0, 73, 0)), 6, zone.accentColor, Enum.Material.Neon);
	}
}

const BUILDERS: Record<number, (parent: Folder) => void> = {
	0: landmarkStart,
	10: landmarkTen,
	25: landmarkTwentyFive,
	50: landmarkFifty,
	75: landmarkSeventyFive,
	90: landmarkNinety,
};

/** Milestone landmarks listed in MapConfig.LANDMARK_STEPS. Purely visual, never collide. */
export function buildLandmarks(root: Folder): void {
	const folder = makeFolder("Landmarks", root);
	for (const step of MapConfig.LANDMARK_STEPS) {
		const build = BUILDERS[step];
		if (build === undefined) continue;
		build(makeFolder(`Landmark_${step}`, folder));
	}
}
