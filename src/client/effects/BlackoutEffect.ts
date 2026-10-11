import { Lighting, TweenService } from "@rbxts/services";
import { EventConfig } from "shared/config/EventConfig";
import { ClientEffect } from "./ClientEffect";

const NAME = "EventBlackout";

/**
 * Darkens the world with ONE temporary ColorCorrectionEffect of its own. The base
 * lighting, atmosphere and the zone ColorCorrection are never read or written,
 * so there is no "previous state" to restore: destroying the instance is the restore.
 */
export function createBlackoutEffect(): ClientEffect {
	const config = EventConfig.EVENTS.Blackout;
	Lighting.FindFirstChild(NAME)?.Destroy(); // leftover of a previous effect, if any

	const grading = new Instance("ColorCorrectionEffect");
	grading.Name = NAME;
	grading.Parent = Lighting;
	const fadeIn = TweenService.Create(grading, new TweenInfo(config.fadeSeconds), {
		Brightness: -config.intensity,
		Saturation: -0.25,
	});
	fadeIn.Play();

	let destroyed = false;
	return {
		destroy(immediate) {
			if (destroyed) return;
			destroyed = true;
			fadeIn.Cancel();
			if (immediate || config.fadeSeconds <= 0) {
				grading.Destroy();
				return;
			}
			const fadeOut = TweenService.Create(grading, new TweenInfo(config.fadeSeconds), {
				Brightness: 0,
				Saturation: 0,
			});
			fadeOut.Completed.Once(() => grading.Destroy());
			fadeOut.Play();
			task.delay(config.fadeSeconds + 0.5, () => grading.Destroy()); // safety net
		},
	};
}
