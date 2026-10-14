import { CollectionService } from "@rbxts/services";
import { MapConfig, ZONES } from "shared/config/MapConfig";
import { GameConfig } from "shared/config/GameConfig";
import { getStepForwardFlat, getStepPosition } from "shared/util/PathUtil";
import { addFaceText, makeCloud, makeCube, makeFolder, makeFrame, makePart, makePillar, studs } from "./MapBuilders";

const { MAX_STEP } = GameConfig;
const { FINAL } = MapConfig;

const rgb = (r: number, g: number, b: number): Color3 => Color3.fromRGB(r, g, b);
const GOLD = rgb(255, 205, 60);
const MARBLE = rgb(250, 244, 232);

export const FINAL_PORTAL_TAG = "FinalPortal";

/**
 * Step 100: a big round platform behind tile 100, a golden gate with a portal
 * and a giant "100", marble spires, light beams, clouds and a distant
 * "COMING SOON" teaser that stays out of reach. The platform is solid and the
 * player is never frozen: after tile 100 they can walk all over it.
 */
export function buildFinalArea(root: Folder): void {
	const folder = makeFolder("FinalArea", root);
	const zone = ZONES[ZONES.size() - 1];
	const tile = getStepPosition(MAX_STEP);
	const forward = getStepForwardFlat(MAX_STEP);
	// Frame centred on tile 100's surface, level, -Z = forward.
	const base = CFrame.lookAt(tile, tile.add(forward));
	const at = (lateral: number, up: number, ahead: number): Vector3 =>
		base.PointToWorldSpace(new Vector3(lateral, up, -ahead));
	const facing = (lateral: number, up: number, ahead: number): CFrame =>
		new CFrame(at(lateral, up, ahead)).mul(base.Rotation);

	// ---- platform: square slab (side = former diameter, same centre), top 0.05 below tile 100's surface
	const platformCentre = at(0, -0.05 - FINAL.PLATFORM_THICKNESS / 2, FINAL.PLATFORM_OFFSET);
	makePart({
		name: "FinalPlatform",
		parent: folder,
		size: new Vector3(FINAL.PLATFORM_DIAMETER, FINAL.PLATFORM_THICKNESS, FINAL.PLATFORM_DIAMETER),
		cframe: new CFrame(platformCentre).mul(base.Rotation),
		color: rgb(255, 246, 222),
		collide: true,
		studs: true,
	});
	// Gold border just inside the edge: a flat neon frame lying on the platform.
	makeFrame(
		folder,
		base,
		platformCentre.add(new Vector3(0, FINAL.PLATFORM_THICKNESS / 2 + 0.1, 0)),
		FINAL.PLATFORM_DIAMETER / 2 - 2,
		1,
		GOLD,
		Enum.Material.Neon,
		"flat",
		0.55,
		"FinalPlatformGlowRing",
	);

	// ---- gate
	const gateAhead = FINAL.GATE_OFFSET;
	for (const side of [-1, 1]) {
		makePart({
			name: "GatePillar",
			parent: folder,
			size: new Vector3(6, FINAL.GATE_HEIGHT, 6),
			cframe: facing(side * FINAL.GATE_HALF_WIDTH, FINAL.GATE_HEIGHT / 2, gateAhead),
			color: MARBLE,
		});
		makePart({
			name: "GatePillarGlow",
			parent: folder,
			size: new Vector3(2, FINAL.GATE_HEIGHT, 8),
			cframe: facing(side * FINAL.GATE_HALF_WIDTH, FINAL.GATE_HEIGHT / 2, gateAhead),
			color: GOLD,
			material: Enum.Material.Neon,
		});
	}
	makePart({
		name: "GateBeam",
		parent: folder,
		size: new Vector3(FINAL.GATE_HALF_WIDTH * 2 + 6, 6, 6),
		cframe: facing(0, FINAL.GATE_HEIGHT + 3, gateAhead),
		color: MARBLE,
	});
	makePart({
		name: "GateBeamGlow",
		parent: folder,
		size: new Vector3(FINAL.GATE_HALF_WIDTH * 2 + 6, 1, 8),
		cframe: facing(0, FINAL.GATE_HEIGHT + 6, gateAhead),
		color: GOLD,
		material: Enum.Material.Neon,
	});

	// ---- portal: glowing square pane + square frame of neon bars
	const portalUp = 16;
	const portalRadius = 13;
	const portal = makePart({
		name: "Portal",
		parent: folder,
		size: new Vector3(portalRadius * 2, portalRadius * 2, 1),
		cframe: facing(0, portalUp, gateAhead),
		color: rgb(255, 240, 190),
		material: Enum.Material.Neon,
		transparency: 0.35,
	});
	portal.SetAttribute("FinalPortal", true);
	portal.SetAttribute("Step", MAX_STEP);
	CollectionService.AddTag(portal, FINAL_PORTAL_TAG);

	makeFrame(
		folder,
		base,
		at(0, portalUp, gateAhead),
		portalRadius + 1,
		2,
		GOLD,
		Enum.Material.Neon,
		"vertical",
		0,
		"PortalRing",
	);

	// Particles + light: the only emitters/lights of the whole area.
	const sparkAnchor = makePart({
		name: "PortalSparkles",
		parent: folder,
		size: new Vector3(portalRadius * 1.6, 1, 1),
		cframe: facing(0, portalUp - portalRadius + 1, gateAhead),
		color: GOLD,
		transparency: 1,
	});
	const sparkles = new Instance("ParticleEmitter");
	sparkles.Rate = 12;
	sparkles.Lifetime = new NumberRange(3, 5);
	sparkles.Speed = new NumberRange(3, 7);
	sparkles.Size = new NumberSequence(1.4, 0);
	sparkles.LightEmission = 1;
	sparkles.Color = new ColorSequence(GOLD);
	sparkles.SpreadAngle = new Vector2(25, 25);
	sparkles.Parent = sparkAnchor;
	const glow = new Instance("PointLight");
	glow.Color = GOLD;
	glow.Brightness = 3;
	glow.Range = 45;
	glow.Parent = portal;

	// ---- giant "100" above the gate (readable from the approach)
	const board = makePart({
		name: "Giant100",
		parent: folder,
		size: new Vector3(46, 22, 2),
		cframe: facing(0, FINAL.GATE_HEIGHT + 19, gateAhead),
		color: rgb(40, 30, 10),
	});
	addFaceText(board, Enum.NormalId.Back, "100", rgb(255, 215, 70), rgb(255, 255, 255));

	// ---- marble spires around the rim (the gate side stays open)
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * 2 * math.pi;
		const lateral = math.cos(angle) * 44;
		const ahead = FINAL.PLATFORM_OFFSET + math.sin(angle) * 44;
		if (ahead < 8) continue;
		const spireBase = at(lateral, 0, ahead);
		makePillar(folder, "Spire", spireBase, 26, 4, MARBLE);
		makeCube(folder, "SpireOrb", spireBase.add(new Vector3(0, 28, 0)), 4, GOLD, Enum.Material.Neon);
	}

	// ---- light beams in the corners
	for (const [lateral, ahead] of [
		[-44, FINAL.PLATFORM_OFFSET + 30],
		[44, FINAL.PLATFORM_OFFSET + 30],
		[-30, FINAL.PLATFORM_OFFSET + 60],
		[30, FINAL.PLATFORM_OFFSET + 60],
	]) {
		makePart({
			name: "LightBeam",
			parent: folder,
			size: new Vector3(4, 420, 4),
			cframe: new CFrame(at(lateral, 200, ahead)),
			color: GOLD,
			material: Enum.Material.Neon,
			transparency: 0.75,
		});
	}

	// ---- big beacon visible from far away (the "end is close" landmark)
	makePart({
		name: "Beacon",
		parent: folder,
		size: new Vector3(8, 700, 8),
		cframe: new CFrame(at(0, 300, FINAL.PLATFORM_OFFSET + 10)),
		color: rgb(255, 236, 170),
		material: Enum.Material.Neon,
		transparency: 0.8,
	});

	// ---- clouds under the platform
	for (const [lateral, ahead] of [
		[-46, 0],
		[46, 10],
		[-40, 50],
		[40, 60],
		[0, 90],
		[-20, -10],
	]) {
		makeCloud(folder, at(lateral, -12, ahead), 1.8, rgb(255, 250, 240), 0.15);
	}

	buildTeaser(folder, at, facing, zone.accentColor);
}

/** "COMING SOON" reveal: a dark monolith and silhouettes beyond the platform, joined by a faint light path. */
function buildTeaser(
	folder: Folder,
	at: (lateral: number, up: number, ahead: number) => Vector3,
	facing: (lateral: number, up: number, ahead: number) => CFrame,
	accent: Color3,
): void {
	const teaser = makeFolder("ComingSoon", folder);
	const distance = FINAL.TEASER_OFFSET;

	// Translucent path leading toward the unknown (not solid: it is only a hint).
	makePart({
		name: "TeaserPath",
		parent: teaser,
		size: new Vector3(10, 0.4, studs(distance - 88)),
		cframe: facing(0, -0.3, 88 + (distance - 88) / 2),
		color: accent,
		material: Enum.Material.Neon,
		transparency: 0.6,
	});

	const monolith = makePart({
		name: "TeaserMonolith",
		parent: teaser,
		size: new Vector3(64, 96, 6),
		cframe: facing(0, 40, distance),
		color: rgb(14, 12, 24),
	});
	addFaceText(monolith, Enum.NormalId.Back, "COMING SOON", rgb(255, 255, 255), rgb(160, 110, 255));
	makePart({
		name: "TeaserMonolithEdge",
		parent: teaser,
		size: new Vector3(66, 1, 7),
		cframe: facing(0, 88.5, distance),
		color: rgb(160, 110, 255),
		material: Enum.Material.Neon,
	});

	// Dark silhouettes behind it.
	const towers: [number, number, number][] = [
		[-60, 90, 150],
		[-35, 120, 190],
		[40, 100, 175],
		[70, 140, 215],
		[0, 160, 240],
	];
	for (const [lateral, height, ahead] of towers) {
		makePart({
			name: "TeaserTower",
			parent: teaser,
			size: new Vector3(14, height, 14),
			cframe: new CFrame(at(lateral, height / 2 - 30, ahead)),
			color: rgb(16, 14, 30),
		});
	}
}
