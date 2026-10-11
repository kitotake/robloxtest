import { Lighting, TweenService } from "@rbxts/services";
import { EventConfig } from "shared/config/EventConfig";
import { ClientEffect } from "./ClientEffect";

const TINT_NAME = "EventStormTint";
const GUI_NAME = "EventStorm";
const MIN_SECONDS_BETWEEN_FLASHES = 1.5; // never more than one soft flash every 1.5 s

/**
 * Rain streaks, a cold tint and soft lightning, all made of the effect's own
 * instances (a ColorCorrectionEffect and a ScreenGui). Nothing of the map, the
 * camera or the base atmosphere is touched, and there is no per-frame loop:
 * rain is UI tweens, lightning is a one-shot timer chain that stops with the effect.
 */
export function createStormEffect(playerGui: PlayerGui): ClientEffect {
	const config = EventConfig.EVENTS.Storm;
	Lighting.FindFirstChild(TINT_NAME)?.Destroy();
	playerGui.FindFirstChild(GUI_NAME)?.Destroy();
	const random = new Random();
	const tweens: Tween[] = [];
	let destroyed = false;

	const tint = new Instance("ColorCorrectionEffect");
	tint.Name = TINT_NAME;
	tint.Parent = Lighting;
	const tintIn = TweenService.Create(tint, new TweenInfo(config.fadeSeconds), {
		TintColor: Color3.fromRGB(190, 205, 230),
		Saturation: -0.25 * config.intensity,
		Brightness: -0.1 * config.intensity,
	});
	tintIn.Play();

	const gui = new Instance("ScreenGui");
	gui.Name = GUI_NAME;
	gui.ResetOnSpawn = false;
	gui.IgnoreGuiInset = true;
	gui.DisplayOrder = 2; // under the HUD (5): buttons and notices stay readable
	gui.Parent = playerGui;

	const veil = new Instance("Frame");
	veil.Size = new UDim2(1, 0, 1, 0);
	veil.BackgroundColor3 = Color3.fromRGB(15, 20, 35);
	veil.BackgroundTransparency = 1 - 0.18 * config.intensity;
	veil.BorderSizePixel = 0;
	veil.Parent = gui;

	const streakCount = math.floor(10 + 30 * config.intensity);
	for (let i = 0; i < streakCount; i++) {
		const streak = new Instance("Frame");
		const x = random.NextNumber();
		streak.Size = new UDim2(0, 2, 0, 34);
		streak.Position = new UDim2(x, 0, -0.1, 0);
		streak.Rotation = 12;
		streak.BackgroundColor3 = Color3.fromRGB(190, 210, 255);
		streak.BackgroundTransparency = 0.55;
		streak.BorderSizePixel = 0;
		streak.Parent = gui;
		const fall = TweenService.Create(
			streak,
			new TweenInfo(
				0.5 + random.NextNumber() * 0.5,
				Enum.EasingStyle.Linear,
				Enum.EasingDirection.In,
				-1,
				false,
				random.NextNumber(),
			),
			{ Position: new UDim2(x - 0.04, 0, 1.1, 0) },
		);
		tweens.push(fall);
		fall.Play();
	}

	if (config.lightning) {
		const flash = new Instance("Frame");
		flash.Size = new UDim2(1, 0, 1, 0);
		flash.BackgroundColor3 = new Color3(1, 1, 1);
		flash.BackgroundTransparency = 1;
		flash.BorderSizePixel = 0;
		flash.Parent = gui;
		const scheduleFlash = () => {
			task.delay(MIN_SECONDS_BETWEEN_FLASHES + random.NextNumber() * 2.5, () => {
				if (destroyed) return;
				flash.BackgroundTransparency = 0.6;
				TweenService.Create(flash, new TweenInfo(0.35), { BackgroundTransparency: 1 }).Play();
				scheduleFlash();
			});
		};
		scheduleFlash();
	}

	return {
		destroy(immediate) {
			if (destroyed) return;
			destroyed = true;
			tintIn.Cancel();
			for (const tween of tweens) tween.Cancel();
			gui.Destroy(); // rain and lightning end at once
			if (immediate || config.fadeSeconds <= 0) {
				tint.Destroy();
				return;
			}
			const fadeOut = TweenService.Create(tint, new TweenInfo(config.fadeSeconds), {
				Saturation: 0,
				Brightness: 0,
			});
			fadeOut.Completed.Once(() => tint.Destroy());
			fadeOut.Play();
			task.delay(config.fadeSeconds + 0.5, () => tint.Destroy()); // safety net
		},
	};
}
