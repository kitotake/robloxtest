/**
 * Visual / layout configuration of the playable map. Gameplay numbers stay in
 * GameConfig; everything here is cosmetic or describes the shape of the path.
 * It lives in `shared` because the path math (PathUtil) is used by both the
 * server (MapService, AutoMovementService) and the client (MovementController).
 */

export type ZoneId = "Beginning" | "Sky" | "Neon" | "Storm" | "Danger" | "Void" | "FinalApproach" | "Final";

export interface AtmosphereDef {
	/** Unwrapped hours: never decreases except Void → FinalApproach, which crosses midnight (24+). */
	clockTime: number;
	brightness: number;
	exposure: number;
	ambient: Color3;
	outdoorAmbient: Color3;
	fogColor: Color3;
	fogStart: number;
	fogEnd: number;
	atmosphereDensity: number;
	atmosphereColor: Color3;
	atmosphereDecay: Color3;
	atmosphereHaze: number;
	atmosphereGlare: number;
	starCount: number;
	bloomIntensity: number;
	/** ColorCorrectionEffect: overall tint / saturation / contrast / brightness of the zone. */
	tint: Color3;
	saturation: number;
	contrast: number;
	colorBrightness: number;
}

export interface ZoneDef {
	id: ZoneId;
	displayName: string;
	fromStep: number;
	toStep: number;
	/** Two tile colours alternated along the zone. */
	tileColors: readonly [Color3, Color3];
	/** Milestone tiles, gates and trims. */
	accentColor: Color3;
	/** Step number colour. */
	textColor: Color3;
	tileMaterial: Enum.Material;
	atmosphere: AtmosphereDef;
}

const rgb = (r: number, g: number, b: number): Color3 => Color3.fromRGB(r, g, b);

export const ZONES: readonly ZoneDef[] = [
	{
		id: "Beginning",
		displayName: "BEGINNING",
		fromStep: 0,
		toStep: 10,
		tileColors: [rgb(236, 240, 226), rgb(214, 226, 200)],
		accentColor: rgb(90, 200, 120),
		textColor: rgb(60, 100, 70),
		tileMaterial: Enum.Material.SmoothPlastic,
		atmosphere: {
			clockTime: 13,
			brightness: 2.5,
			exposure: 0,
			ambient: rgb(120, 130, 150),
			outdoorAmbient: rgb(150, 170, 190),
			fogColor: rgb(190, 225, 255),
			fogStart: 200,
			fogEnd: 1400,
			atmosphereDensity: 0.3,
			atmosphereColor: rgb(199, 225, 255),
			atmosphereDecay: rgb(255, 236, 200),
			atmosphereHaze: 1,
			atmosphereGlare: 0,
			starCount: 0,
			bloomIntensity: 0.3,
			tint: rgb(255, 250, 240),
			saturation: 0.05,
			contrast: 0.03,
			colorBrightness: 0,
		},
	},
	{
		id: "Sky",
		displayName: "SKY",
		fromStep: 11,
		toStep: 25,
		tileColors: [rgb(250, 252, 255), rgb(205, 228, 250)],
		accentColor: rgb(80, 170, 255),
		textColor: rgb(50, 110, 190),
		tileMaterial: Enum.Material.SmoothPlastic,
		atmosphere: {
			clockTime: 12,
			brightness: 3,
			exposure: 0.1,
			ambient: rgb(140, 160, 190),
			outdoorAmbient: rgb(170, 195, 230),
			fogColor: rgb(175, 215, 255),
			fogStart: 300,
			fogEnd: 2200,
			atmosphereDensity: 0.25,
			atmosphereColor: rgb(170, 215, 255),
			atmosphereDecay: rgb(255, 245, 225),
			atmosphereHaze: 0.8,
			atmosphereGlare: 0.2,
			starCount: 0,
			bloomIntensity: 0.35,
			tint: rgb(240, 248, 255),
			saturation: 0.12,
			contrast: 0.05,
			colorBrightness: 0.02,
		},
	},
	{
		id: "Neon",
		displayName: "NEON",
		fromStep: 26,
		toStep: 40,
		tileColors: [rgb(28, 30, 62), rgb(40, 34, 84)],
		accentColor: rgb(0, 230, 255),
		textColor: rgb(0, 240, 255),
		tileMaterial: Enum.Material.SmoothPlastic,
		atmosphere: {
			clockTime: 19.5,
			brightness: 1.5,
			exposure: 0.2,
			ambient: rgb(40, 40, 90),
			outdoorAmbient: rgb(60, 50, 120),
			fogColor: rgb(30, 20, 70),
			fogStart: 150,
			fogEnd: 1000,
			atmosphereDensity: 0.35,
			atmosphereColor: rgb(120, 80, 255),
			atmosphereDecay: rgb(0, 200, 255),
			atmosphereHaze: 1.2,
			atmosphereGlare: 0.5,
			starCount: 1500,
			bloomIntensity: 0.7,
			tint: rgb(225, 215, 255),
			saturation: 0.25,
			contrast: 0.12,
			colorBrightness: 0,
		},
	},
	{
		id: "Storm",
		displayName: "STORM",
		fromStep: 41,
		toStep: 55,
		tileColors: [rgb(78, 86, 102), rgb(64, 72, 88)],
		accentColor: rgb(230, 235, 255),
		textColor: rgb(225, 232, 250),
		tileMaterial: Enum.Material.Slate,
		atmosphere: {
			clockTime: 17.5,
			brightness: 0.8,
			exposure: -0.2,
			ambient: rgb(60, 65, 80),
			outdoorAmbient: rgb(80, 90, 110),
			fogColor: rgb(60, 66, 80),
			fogStart: 80,
			fogEnd: 520,
			atmosphereDensity: 0.5,
			atmosphereColor: rgb(90, 100, 120),
			atmosphereDecay: rgb(60, 60, 80),
			atmosphereHaze: 2.5,
			atmosphereGlare: 0,
			starCount: 0,
			bloomIntensity: 0.25,
			tint: rgb(205, 215, 235),
			saturation: -0.15,
			contrast: 0.15,
			colorBrightness: -0.04,
		},
	},
	{
		id: "Danger",
		displayName: "DANGER",
		fromStep: 56,
		toStep: 70,
		tileColors: [rgb(70, 40, 36), rgb(88, 48, 38)],
		accentColor: rgb(255, 110, 30),
		textColor: rgb(255, 150, 60),
		tileMaterial: Enum.Material.Basalt,
		atmosphere: {
			clockTime: 18.4,
			brightness: 1.8,
			exposure: 0.1,
			ambient: rgb(110, 50, 30),
			outdoorAmbient: rgb(170, 80, 40),
			fogColor: rgb(120, 40, 20),
			fogStart: 100,
			fogEnd: 800,
			atmosphereDensity: 0.4,
			atmosphereColor: rgb(255, 120, 60),
			atmosphereDecay: rgb(255, 60, 0),
			atmosphereHaze: 2,
			atmosphereGlare: 0.3,
			starCount: 0,
			bloomIntensity: 0.5,
			tint: rgb(255, 225, 205),
			saturation: 0.2,
			contrast: 0.12,
			colorBrightness: 0,
		},
	},
	{
		id: "Void",
		displayName: "VOID",
		fromStep: 71,
		toStep: 85,
		tileColors: [rgb(26, 22, 44), rgb(36, 28, 62)],
		accentColor: rgb(170, 110, 255),
		textColor: rgb(200, 160, 255),
		tileMaterial: Enum.Material.Glass,
		atmosphere: {
			clockTime: 24,
			brightness: 0.5,
			exposure: 0.2,
			ambient: rgb(25, 20, 50),
			outdoorAmbient: rgb(40, 30, 80),
			fogColor: rgb(8, 5, 20),
			fogStart: 200,
			fogEnd: 1600,
			atmosphereDensity: 0.2,
			atmosphereColor: rgb(30, 20, 60),
			atmosphereDecay: rgb(10, 5, 25),
			atmosphereHaze: 0.5,
			atmosphereGlare: 0,
			starCount: 5000,
			bloomIntensity: 0.6,
			tint: rgb(215, 205, 255),
			saturation: 0.1,
			contrast: 0.18,
			colorBrightness: -0.03,
		},
	},
	{
		id: "FinalApproach",
		displayName: "FINAL APPROACH",
		fromStep: 86,
		toStep: 99,
		tileColors: [rgb(255, 246, 222), rgb(255, 232, 178)],
		accentColor: rgb(255, 205, 70),
		textColor: rgb(190, 130, 20),
		tileMaterial: Enum.Material.Marble,
		atmosphere: {
			clockTime: 30,
			brightness: 3.5,
			exposure: 0.2,
			ambient: rgb(170, 150, 110),
			outdoorAmbient: rgb(230, 200, 140),
			fogColor: rgb(255, 235, 190),
			fogStart: 250,
			fogEnd: 2000,
			atmosphereDensity: 0.3,
			atmosphereColor: rgb(255, 235, 190),
			atmosphereDecay: rgb(255, 200, 120),
			atmosphereHaze: 1,
			atmosphereGlare: 1.5,
			starCount: 0,
			bloomIntensity: 0.6,
			tint: rgb(255, 240, 210),
			saturation: 0.2,
			contrast: 0.08,
			colorBrightness: 0.03,
		},
	},
	{
		id: "Final",
		displayName: "STEP 100",
		fromStep: 100,
		toStep: 100,
		tileColors: [rgb(255, 215, 90), rgb(255, 225, 120)],
		accentColor: rgb(255, 215, 0),
		textColor: rgb(255, 255, 255),
		tileMaterial: Enum.Material.Neon,
		atmosphere: {
			clockTime: 36,
			brightness: 4,
			exposure: 0.3,
			ambient: rgb(200, 190, 150),
			outdoorAmbient: rgb(255, 235, 180),
			fogColor: rgb(255, 245, 215),
			fogStart: 300,
			fogEnd: 2600,
			atmosphereDensity: 0.25,
			atmosphereColor: rgb(255, 245, 215),
			atmosphereDecay: rgb(255, 215, 120),
			atmosphereHaze: 0.8,
			atmosphereGlare: 2,
			starCount: 0,
			bloomIntensity: 0.85,
			tint: rgb(255, 245, 220),
			saturation: 0.3,
			contrast: 0.1,
			colorBrightness: 0.05,
		},
	},
];

export interface ZoneDensity {
	/** Chance (0..1) of a small prop next to the path, per side and per step. */
	propChance: number;
	/** Number of distant scenery pieces (islands, skylines, volcanoes…) spread over the zone. */
	backdropCount: number;
	/** One ambient particle emitter every N steps (0 = none). */
	particleEvery: number;
}

/** Visual density of the NEW environment layers (the original scenery in ZoneDecorator is unchanged). */
export const ZONE_DENSITY: Record<ZoneId, ZoneDensity> = {
	Beginning: { propChance: 0.55, backdropCount: 5, particleEvery: 5 },
	Sky: { propChance: 0.6, backdropCount: 7, particleEvery: 5 },
	Neon: { propChance: 0.7, backdropCount: 7, particleEvery: 5 },
	Storm: { propChance: 0.6, backdropCount: 6, particleEvery: 5 },
	Danger: { propChance: 0.65, backdropCount: 6, particleEvery: 5 },
	Void: { propChance: 0.6, backdropCount: 7, particleEvery: 5 },
	FinalApproach: { propChance: 0.6, backdropCount: 6, particleEvery: 5 },
	Final: { propChance: 0, backdropCount: 0, particleEvery: 0 },
};

export const MapConfig = {
	/** Base of every seeded Random used by the map: same seed = exactly the same map on every server. */
	SEED: 20260101,
	/** Global multiplier applied to every propChance / backdropCount (1 = as configured, 0 = bare path). */
	DENSITY_SCALE: 1,
	/** Step numbers that get a big landmark (the final area is built separately). */
	LANDMARK_STEPS: [0, 10, 25, 50, 75, 90] as readonly number[],
	/** Soft budget: MapService warns if the generated decoration exceeds this many parts. */
	MAX_DECOR_PARTS: 2600,

	CAMERA: {
		/** Players keep the normal Roblox camera but cannot zoom farther than this (studs). */
		MAX_ZOOM_DISTANCE: 45,
	},

	/** Tag added to every Tile_N part (CollectionService), so events can find tiles without name parsing. */
	TILE_TAG: "ProgressTile",
	/** Folder (in Workspace) holding every decorative object. Kept apart from ProgressPath. */
	DECOR_FOLDER_NAME: "MapDecor",

	/** Names of the lighting objects created by the server and tweened by the client per zone. */
	ATMOSPHERE_NAME: "WU100Atmosphere",
	SKY_NAME: "WU100Sky",
	BLOOM_NAME: "WU100Bloom",
	COLOR_CORRECTION_NAME: "WU100ColorCorrection",
	BLOOM_THRESHOLD: 1.1,

	CURVE: {
		/**
		 * Heading change (radians per step) is a sum of two slow sine waves, then clamped.
		 * 0.06 rad ≈ 3.4°: at the widest tile this keeps the wedge between two tiles under ~1.5 studs.
		 */
		MAX_TURN_PER_STEP: 0.06,
		WAVE_1: { amplitude: 0.055, period: 42, phase: 4.8 },
		WAVE_2: { amplitude: 0.022, period: 17, phase: 0 },
	},

	/**
	 * Height of the tile surface above PATH.START_POSITION.Y, as [step, height] anchors.
	 * Heights are cosine-interpolated between anchors, so the steepest slope is ≈ 2 studs
	 * per 12-stud step (< 10°): easy for the automatic walk, with no jump anywhere.
	 */
	HEIGHT_ANCHORS: [
		[0, 0],
		[10, 2],
		[25, 18],
		[40, 30],
		[55, 32],
		[70, 20],
		[85, 34],
		[99, 46],
		[100, 46],
	] as readonly (readonly [number, number])[],

	/** Wider "plaza" tiles: every 10th tile is wide, its neighbours are slightly wider. */
	TILE_WIDTH_PLAZA: 28,
	TILE_WIDTH_NEAR_PLAZA: 20,
	/** Gap left between two consecutive tiles along the path (studs). */
	TILE_GAP: 0.4,

	FINAL: {
		/** Platform centre, measured forward from tile 100. */
		PLATFORM_OFFSET: 36,
		PLATFORM_DIAMETER: 96,
		PLATFORM_THICKNESS: 3,
		/** Gate distance forward from tile 100. */
		GATE_OFFSET: 26,
		GATE_HALF_WIDTH: 15,
		GATE_HEIGHT: 38,
		/** The "COMING SOON" teaser floats this far forward from tile 100, out of reach. */
		TEASER_OFFSET: 150,
	},
};

export function getZoneForStep(step: number): ZoneDef {
	for (const zone of ZONES) {
		if (step >= zone.fromStep && step <= zone.toStep) return zone;
	}
	return step < 0 ? ZONES[0] : ZONES[ZONES.size() - 1];
}
