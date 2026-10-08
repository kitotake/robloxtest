import { buildAmbientParticles } from "./AmbientParticles";
import { buildBackdrop } from "./Backdrop";
import { buildFinalCelebration } from "./FinalCelebration";
import { buildLandmarks } from "./Landmarks";
import { makeFolder } from "./MapBuilders";
import { buildPathFraming } from "./PathFraming";
import { buildZoneProps } from "./ZoneProps";

/**
 * Environment layers added on top of the original scenery. Everything is
 * cosmetic, non-colliding (except the podium), seeded (same map on every
 * server) and tweakable from MapConfig / ZONE_DENSITY.
 */
export function buildEnvironment(root: Folder): void {
	const env = makeFolder("Environment", root);
	buildZoneProps(env);
	buildBackdrop(env);
	buildLandmarks(env);
	buildPathFraming(env);
	buildAmbientParticles(env);
	buildFinalCelebration(env);
}
