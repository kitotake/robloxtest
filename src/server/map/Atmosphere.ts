import { Lighting } from "@rbxts/services";
import { MapConfig, ZONES } from "shared/config/MapConfig";

/**
 * Creates the lighting objects once, set to the first zone. The client
 * (ZoneAtmosphereController) then tweens them as the local player moves
 * through the zones, so each player sees the atmosphere of their own step.
 */
export function createAtmosphere(): void {
	const def = ZONES[0].atmosphere;

	Lighting.ClockTime = def.clockTime % 24;
	Lighting.Brightness = def.brightness;
	Lighting.ExposureCompensation = def.exposure;
	Lighting.Ambient = def.ambient;
	Lighting.OutdoorAmbient = def.outdoorAmbient;
	Lighting.FogColor = def.fogColor;
	Lighting.FogStart = def.fogStart;
	Lighting.FogEnd = def.fogEnd;

	for (const name of [
		MapConfig.ATMOSPHERE_NAME,
		MapConfig.SKY_NAME,
		MapConfig.BLOOM_NAME,
		MapConfig.COLOR_CORRECTION_NAME,
	]) {
		Lighting.FindFirstChild(name)?.Destroy();
	}

	const atmosphere = new Instance("Atmosphere");
	atmosphere.Name = MapConfig.ATMOSPHERE_NAME;
	atmosphere.Density = def.atmosphereDensity;
	atmosphere.Color = def.atmosphereColor;
	atmosphere.Decay = def.atmosphereDecay;
	atmosphere.Haze = def.atmosphereHaze;
	atmosphere.Glare = def.atmosphereGlare;
	atmosphere.Parent = Lighting;

	const sky = new Instance("Sky");
	sky.Name = MapConfig.SKY_NAME;
	sky.StarCount = def.starCount;
	sky.CelestialBodiesShown = true;
	sky.SunAngularSize = 18;
	sky.MoonAngularSize = 16;
	sky.Parent = Lighting;

	// Cheap glow for every Neon material; one effect for the whole map.
	const bloom = new Instance("BloomEffect");
	bloom.Name = MapConfig.BLOOM_NAME;
	bloom.Intensity = def.bloomIntensity;
	bloom.Size = 24;
	bloom.Threshold = MapConfig.BLOOM_THRESHOLD;
	bloom.Parent = Lighting;

	// Overall colour grading of the zone (tweened by the client). No DepthOfField on purpose: it blurs
	// the other players and costs a full-screen pass on mobile.
	const grading = new Instance("ColorCorrectionEffect");
	grading.Name = MapConfig.COLOR_CORRECTION_NAME;
	grading.TintColor = def.tint;
	grading.Saturation = def.saturation;
	grading.Contrast = def.contrast;
	grading.Brightness = def.colorBrightness;
	grading.Parent = Lighting;
}
