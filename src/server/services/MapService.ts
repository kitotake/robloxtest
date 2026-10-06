import { Workspace } from "@rbxts/services";
import { GameConfig } from "shared/config/GameConfig";
import { createLogger } from "shared/util/Logger";
import { getStepPosition } from "shared/util/PathUtil";

const log = createLogger("MapService");
const { PATH, MAX_STEP } = GameConfig;

const COLOR_START = Color3.fromRGB(70, 200, 110);
const COLOR_END = Color3.fromRGB(255, 200, 40);
const COLOR_MILESTONE = Color3.fromRGB(120, 90, 200);
const COLOR_A = Color3.fromRGB(60, 90, 140);
const COLOR_B = Color3.fromRGB(75, 110, 165);

/**
 * Builds the numbered tile path (0 → MAX_STEP) from config. If a folder with
 * the configured name already exists in Workspace it is left untouched, so a
 * hand-built map can replace the generated one.
 */
export class MapService {
	build(): Folder {
		const existing = Workspace.FindFirstChild(PATH.FOLDER_NAME);
		if (existing !== undefined && existing.IsA("Folder")) {
			log.debug("Using existing path folder");
			return existing;
		}

		const folder = new Instance("Folder");
		folder.Name = PATH.FOLDER_NAME;
		for (let step = 0; step <= MAX_STEP; step++) this.createTile(step, folder);
		this.createSpawn(folder);
		folder.Parent = Workspace;
		log.debug(`Built ${MAX_STEP + 1} tiles`);
		return folder;
	}

	private createTile(step: number, parent: Folder): void {
		const tile = new Instance("Part");
		tile.Name = `Tile_${step}`;
		tile.Anchored = true;
		tile.Material = Enum.Material.SmoothPlastic;
		tile.TopSurface = Enum.SurfaceType.Smooth;
		tile.BottomSurface = Enum.SurfaceType.Smooth;
		tile.Size = new Vector3(PATH.TILE_WIDTH, PATH.TILE_THICKNESS, PATH.TILE_SPACING - 0.4);
		tile.Position = getStepPosition(step).sub(new Vector3(0, PATH.TILE_THICKNESS / 2, 0));
		tile.Color = this.getTileColor(step);
		tile.SetAttribute("Step", step);

		const gui = new Instance("SurfaceGui");
		gui.Face = Enum.NormalId.Top;
		gui.LightInfluence = 0;
		gui.CanvasSize = new Vector2(PATH.TILE_WIDTH * 20, PATH.TILE_SPACING * 20);
		gui.Parent = tile;

		const label = new Instance("TextLabel");
		label.Size = new UDim2(1, 0, 1, 0);
		label.BackgroundTransparency = 1;
		label.Text = tostring(step);
		label.TextScaled = true;
		label.Font = Enum.Font.GothamBold;
		label.TextColor3 = new Color3(1, 1, 1);
		label.TextTransparency = 0.15;
		label.Parent = gui;

		tile.Parent = parent;
	}

	private getTileColor(step: number): Color3 {
		if (step === 0) return COLOR_START;
		if (step === MAX_STEP) return COLOR_END;
		if (step % 10 === 0) return COLOR_MILESTONE;
		return step % 2 === 0 ? COLOR_A : COLOR_B;
	}

	private createSpawn(parent: Folder): void {
		const spawn = new Instance("SpawnLocation");
		spawn.Name = "StartSpawn";
		spawn.Anchored = true;
		spawn.Neutral = true;
		spawn.Duration = 0;
		spawn.Transparency = 1;
		spawn.CanCollide = false;
		spawn.CanTouch = false;
		spawn.Size = new Vector3(6, 1, 6);
		spawn.Position = getStepPosition(0).add(new Vector3(0, 0.5, 0));
		spawn.Parent = parent;
	}
}
