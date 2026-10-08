import { Lighting, Players, TweenService } from "@rbxts/services";
import { AtmosphereDef, getZoneForStep, MapConfig, ZoneId } from "shared/config/MapConfig";
import { ProgressStore } from "../stores/ProgressStore";

const TWEEN_SECONDS = 4;

/**
 * Cosmetic only: tweens the lighting (sky colour, fog, stars, time of day) to
 * the zone of the local player's step. It reacts to step changes (no per-frame
 * work) and each player sees the atmosphere of their own position.
 */
export class ZoneAtmosphereController {
	private currentZone: ZoneId | undefined;
	/** Unwrapped hours (can exceed 24) so the sun never sweeps backwards between two zones. */
	private readonly clock = new Instance("NumberValue");

	constructor(private readonly store: ProgressStore) {}

	start(): void {
		this.clock.Value = Lighting.ClockTime;
		this.clock.Changed.Connect((hours) => (Lighting.ClockTime = hours % 24));

		const userId = Players.LocalPlayer.UserId;
		this.store.changed.connect((id, step) => {
			if (id === userId) this.apply(step);
		});
		this.apply(this.store.get(userId) ?? 0);
	}

	private apply(step: number): void {
		const zone = getZoneForStep(step);
		if (zone.id === this.currentZone) return;
		const first = this.currentZone === undefined;
		this.currentZone = zone.id;
		this.tweenTo(zone.atmosphere, first ? 0 : TWEEN_SECONDS);
	}

	private tweenTo(def: AtmosphereDef, seconds: number): void {
		const info = new TweenInfo(seconds, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut);

		TweenService.Create(Lighting, info, {
			Brightness: def.brightness,
			ExposureCompensation: def.exposure,
			Ambient: def.ambient,
			OutdoorAmbient: def.outdoorAmbient,
			FogColor: def.fogColor,
			FogStart: def.fogStart,
			FogEnd: def.fogEnd,
		}).Play();
		TweenService.Create(this.clock, info, { Value: def.clockTime }).Play();

		const atmosphere = Lighting.FindFirstChild(MapConfig.ATMOSPHERE_NAME);
		if (atmosphere !== undefined && atmosphere.IsA("Atmosphere")) {
			TweenService.Create(atmosphere, info, {
				Density: def.atmosphereDensity,
				Color: def.atmosphereColor,
				Decay: def.atmosphereDecay,
				Haze: def.atmosphereHaze,
				Glare: def.atmosphereGlare,
			}).Play();
		}

		const bloom = Lighting.FindFirstChild(MapConfig.BLOOM_NAME);
		if (bloom !== undefined && bloom.IsA("BloomEffect")) {
			TweenService.Create(bloom, info, { Intensity: def.bloomIntensity }).Play();
		}

		const grading = Lighting.FindFirstChild(MapConfig.COLOR_CORRECTION_NAME);
		if (grading !== undefined && grading.IsA("ColorCorrectionEffect")) {
			TweenService.Create(grading, info, {
				TintColor: def.tint,
				Saturation: def.saturation,
				Contrast: def.contrast,
				Brightness: def.colorBrightness,
			}).Play();
		}

		const sky = Lighting.FindFirstChild(MapConfig.SKY_NAME);
		if (sky !== undefined && sky.IsA("Sky")) {
			TweenService.Create(sky, info, { StarCount: def.starCount }).Play();
		}
	}
}
