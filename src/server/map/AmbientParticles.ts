import { ZONES, ZONE_DENSITY, ZoneId } from "shared/config/MapConfig";
import { makeEmitterAnchor, makeFolder } from "./MapBuilders";
import { place } from "./PathFrame";

interface EmitterStyle {
	color: Color3;
	size: [number, number];
	rate: number;
	lifetime: [number, number];
	speed: [number, number];
	acceleration: Vector3;
	lightEmission: number;
	volume: Vector3;
	up: number;
	direction?: Enum.NormalId;
	transparency?: [number, number];
}

const C = (r: number, g: number, b: number): Color3 => Color3.fromRGB(r, g, b);

/** One calm emitter style per zone. Rates are low on purpose (mobile). */
const STYLES: Partial<Record<ZoneId, EmitterStyle>> = {
	// Pollen / fireflies.
	Beginning: {
		color: C(255, 245, 170),
		size: [0.5, 0],
		rate: 7,
		lifetime: [6, 9],
		speed: [0.5, 2],
		acceleration: new Vector3(0, 0.3, 0),
		lightEmission: 0.6,
		volume: new Vector3(70, 20, 70),
		up: 8,
	},
	// Soft drifting mist.
	Sky: {
		color: C(255, 255, 255),
		size: [7, 11],
		rate: 1.5,
		lifetime: [9, 13],
		speed: [1, 3],
		acceleration: new Vector3(0, 0, 0),
		lightEmission: 0,
		volume: new Vector3(80, 30, 80),
		up: 4,
		transparency: [0.75, 1],
	},
	// Floating cyan motes.
	Neon: {
		color: C(90, 230, 255),
		size: [0.8, 0],
		rate: 9,
		lifetime: [5, 8],
		speed: [1, 3],
		acceleration: new Vector3(0, 0.6, 0),
		lightEmission: 1,
		volume: new Vector3(70, 24, 70),
		up: 8,
	},
	// Thin rain.
	Storm: {
		color: C(175, 195, 225),
		size: [0.3, 0.3],
		rate: 32,
		lifetime: [0.9, 1.1],
		speed: [45, 55],
		acceleration: new Vector3(0, -40, 0),
		lightEmission: 0.2,
		volume: new Vector3(60, 1, 60),
		up: 32,
		direction: Enum.NormalId.Bottom,
		transparency: [0.35, 0.6],
	},
	// Rising embers.
	Danger: {
		color: C(255, 130, 40),
		size: [0.6, 0],
		rate: 9,
		lifetime: [5, 7],
		speed: [1, 3],
		acceleration: new Vector3(0, 2, 0),
		lightEmission: 1,
		volume: new Vector3(70, 10, 70),
		up: 0,
	},
	// Violet stardust.
	Void: {
		color: C(190, 140, 255),
		size: [0.5, 0],
		rate: 7,
		lifetime: [8, 12],
		speed: [0.3, 1],
		acceleration: new Vector3(0, 0, 0),
		lightEmission: 1,
		volume: new Vector3(80, 30, 80),
		up: 8,
	},
	// Golden motes rising.
	FinalApproach: {
		color: C(255, 215, 110),
		size: [0.8, 0],
		rate: 10,
		lifetime: [5, 8],
		speed: [1, 3],
		acceleration: new Vector3(0, 1.5, 0),
		lightEmission: 1,
		volume: new Vector3(70, 14, 70),
		up: 4,
	},
};

/**
 * Emitters sit in invisible boxes next to the route, one every few steps per
 * zone (about 20 in total). Each is a few dozen live particles at most, and
 * with StreamingEnabled they only exist near the player.
 */
export function buildAmbientParticles(root: Folder): void {
	const folder = makeFolder("Particles", root);
	for (const zone of ZONES) {
		const style = STYLES[zone.id];
		const every = ZONE_DENSITY[zone.id].particleEvery;
		if (style === undefined || every <= 0) continue;

		for (let step = zone.fromStep + 2; step <= zone.toStep; step += every) {
			const anchor = makeEmitterAnchor(
				folder,
				`Emitter_${zone.id}_${step}`,
				place(step, 0, style.up),
				style.volume,
			);
			const emitter = new Instance("ParticleEmitter");
			emitter.Color = new ColorSequence(style.color);
			emitter.Size = new NumberSequence(style.size[0], style.size[1]);
			emitter.Rate = style.rate;
			emitter.Lifetime = new NumberRange(style.lifetime[0], style.lifetime[1]);
			emitter.Speed = new NumberRange(style.speed[0], style.speed[1]);
			emitter.Acceleration = style.acceleration;
			emitter.LightEmission = style.lightEmission;
			emitter.SpreadAngle = new Vector2(180, 180);
			emitter.Shape = Enum.ParticleEmitterShape.Box;
			emitter.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume;
			if (style.direction !== undefined) {
				emitter.EmissionDirection = style.direction;
				emitter.SpreadAngle = new Vector2(2, 2);
			}
			if (style.transparency !== undefined) {
				emitter.Transparency = new NumberSequence(style.transparency[0], style.transparency[1]);
			}
			emitter.Parent = anchor;
		}
	}
}
