import { GameConfig } from "shared/config/GameConfig";
import { MapConfig } from "shared/config/MapConfig";
import { getStepForwardFlat, getStepPosition } from "shared/util/PathUtil";
import {
	addFaceText,
	makeBall,
	makeCloud,
	makeEmitterAnchor,
	makeFolder,
	makePart,
	makePillar,
	makeRing,
} from "./MapBuilders";
import { rgb, seeded, Layer } from "./PathFrame";

const { MAX_STEP } = GameConfig;
const { FINAL } = MapConfig;
const GOLD = rgb(255, 205, 60);
const MARBLE = rgb(250, 244, 232);

/**
 * Extra dressing for step 100, added on top of FinalArea: a podium and a big
 * "YOU MADE IT!" board for the presentation, a halo behind the gate, confetti,
 * and a ring of distant golden towers + clouds so there is never empty void
 * behind the platform.
 */
export function buildFinalCelebration(root: Folder): void {
	const folder = makeFolder("FinalCelebration", root);
	const tile = getStepPosition(MAX_STEP);
	const forward = getStepForwardFlat(MAX_STEP);
	const base = CFrame.lookAt(tile, tile.add(forward));
	const at = (lateral: number, up: number, ahead: number): Vector3 =>
		base.PointToWorldSpace(new Vector3(lateral, up, -ahead));
	const centreAhead = FINAL.PLATFORM_OFFSET;

	// Podium: low gold disc in the middle of the platform (0.6 high, easy to step on).
	makePart({
		name: "Podium",
		parent: folder,
		size: new Vector3(0.6, 22, 22),
		cframe: new CFrame(at(0, 0.3 - 0.05, centreAhead + 12)).mul(CFrame.Angles(0, 0, math.pi / 2)),
		color: rgb(255, 232, 150),
		material: Enum.Material.Marble,
		shape: Enum.PartType.Cylinder,
		collide: true,
	});
	makePart({
		name: "PodiumGlow",
		parent: folder,
		size: new Vector3(0.2, 24, 24),
		cframe: new CFrame(at(0, 0.1, centreAhead + 12)).mul(CFrame.Angles(0, 0, math.pi / 2)),
		color: GOLD,
		material: Enum.Material.Neon,
		shape: Enum.PartType.Cylinder,
		transparency: 0.4,
	});

	// "YOU MADE IT!" board at the far side, facing the gate (readable while standing on the podium).
	const boardAhead = FINAL.PLATFORM_OFFSET + 44;
	const board = makePart({
		name: "YouMadeItBoard",
		parent: folder,
		size: new Vector3(44, 11, 1.5),
		cframe: new CFrame(at(0, 22, boardAhead)).mul(base.Rotation),
		color: rgb(40, 30, 10),
	});
	addFaceText(board, Enum.NormalId.Back, "YOU MADE IT!", rgb(255, 225, 90), rgb(255, 255, 255));
	for (const side of [-1, 1]) {
		makePillar(folder, "BoardPost", at(side * 20, 0, boardAhead), 17, 1.6, MARBLE, Enum.Material.Marble);
		makeBall(folder, "BoardOrb", at(side * 20, 18.5, boardAhead), 2.4, GOLD, Enum.Material.Neon);
	}

	// Halo behind the gate board.
	makeRing(
		folder,
		base,
		at(0, FINAL.GATE_HEIGHT + 12, FINAL.GATE_OFFSET + 6),
		36,
		32,
		2.4,
		GOLD,
		Enum.Material.Neon,
		"vertical",
		0.15,
		"Halo",
	);

	// Confetti: one emitter, slow, multicolour.
	const anchor = makeEmitterAnchor(folder, "ConfettiAnchor", at(0, 30, centreAhead + 4), new Vector3(70, 1, 70));
	const confetti = new Instance("ParticleEmitter");
	confetti.Color = new ColorSequence([
		new ColorSequenceKeypoint(0, rgb(255, 90, 120)),
		new ColorSequenceKeypoint(0.33, rgb(255, 220, 80)),
		new ColorSequenceKeypoint(0.66, rgb(90, 200, 255)),
		new ColorSequenceKeypoint(1, rgb(170, 110, 255)),
	]);
	confetti.Size = new NumberSequence(0.7, 0.7);
	confetti.Rate = 16;
	confetti.Lifetime = new NumberRange(8, 11);
	confetti.Speed = new NumberRange(1, 4);
	confetti.Acceleration = new Vector3(0, -3, 0);
	confetti.LightEmission = 0.5;
	confetti.RotSpeed = new NumberRange(-180, 180);
	confetti.SpreadAngle = new Vector2(40, 40);
	confetti.EmissionDirection = Enum.NormalId.Bottom;
	confetti.Parent = anchor;

	// Distant golden towers all around, except where the path arrives and where the teaser stands.
	const rng = seeded(Layer.Landmarks, 100);
	const centre = at(0, 0, centreAhead);
	for (let i = 0; i < 18; i++) {
		const angle = (i / 18) * 2 * math.pi;
		const dx = math.cos(angle);
		const dz = math.sin(angle); // dz > 0 = forward (towards the teaser), dz < 0 = back (towards the path)
		if (math.abs(dx) < 0.45 && dz > 0.55) continue;
		if (math.abs(dx) < 0.7 && dz < -0.6) continue;
		const radius = rng.NextNumber(150, 230);
		const height = rng.NextNumber(70, 200);
		const pos = centre.add(base.Rotation.PointToWorldSpace(new Vector3(dx * radius, 0, -dz * radius)));
		const bottom = new Vector3(pos.X, tile.Y - 60, pos.Z);
		makePillar(
			folder,
			"CityTower",
			bottom,
			height,
			rng.NextNumber(12, 20),
			rgb(255, 240, 200),
			Enum.Material.Marble,
		);
		makeBall(folder, "CityTowerGlow", bottom.add(new Vector3(0, height + 4, 0)), 9, GOLD, Enum.Material.Neon);
	}

	// A second layer of clouds, higher than the ones under the platform.
	for (let i = 0; i < 10; i++) {
		const angle = rng.NextNumber(0, 2 * math.pi);
		const radius = rng.NextNumber(70, 140);
		const cloudAt = centre.add(
			new Vector3(math.cos(angle) * radius, rng.NextNumber(-25, 25), math.sin(angle) * radius),
		);
		makeCloud(folder, cloudAt, rng.NextNumber(2, 3.5), rgb(255, 250, 240), 0.15);
	}
}
