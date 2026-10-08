import { CollectionService, Workspace } from "@rbxts/services";
import { GameConfig } from "shared/config/GameConfig";
import { getZoneForStep, MapConfig, ZONES, ZoneDef } from "shared/config/MapConfig";
import { createLogger } from "shared/util/Logger";
import { getStepPosition, getStepSurfaceCFrame, getTileWidth } from "shared/util/PathUtil";
import { createAtmosphere } from "server/map/Atmosphere";
import { buildEnvironment } from "server/map/Environment";
import { buildFinalArea } from "server/map/FinalArea";
import { makeFolder, makePart } from "server/map/MapBuilders";
import { buildSpawnArea } from "server/map/SpawnArea";
import { buildZoneDecor } from "server/map/ZoneDecorator";

const log = createLogger("MapService");
const { PATH, MAX_STEP } = GameConfig;

/** Zones whose tiles get glowing edge trims. */
const TRIM_ZONES = new Set<string>(["Neon", "Danger", "FinalApproach", "Final"]);

/**
 * Builds the playable map: the numbered tile path (0 → MAX_STEP), the spawn
 * area, per-zone scenery and the final area.
 *
 * Tile positions are NOT stored here: they come from the shared PathUtil, so
 * server, client and this builder always agree. Workspace layout:
 *
 *   ProgressPath   Tile_0 … Tile_100, StartSpawn   (what server systems look at)
 *   MapDecor       SpawnArea, ZoneGates, Zone_*, FinalArea   (cosmetic only)
 *
 * If a folder named PATH.FOLDER_NAME already exists in Workspace it is left
 * untouched, so a hand-built map can replace the generated one.
 */
export class MapService {
	private folder: Folder | undefined;

	build(): Folder {
		const existing = Workspace.FindFirstChild(PATH.FOLDER_NAME);
		if (existing !== undefined && existing.IsA("Folder")) {
			log.debug("Using existing path folder");
			this.folder = existing;
			return existing;
		}

		const folder = new Instance("Folder");
		folder.Name = PATH.FOLDER_NAME;
		for (let step = 0; step <= MAX_STEP; step++) this.createTile(step, folder);
		this.createSpawn(folder);
		folder.Parent = Workspace;
		this.folder = folder;
		log.debug(`Built ${MAX_STEP + 1} tiles`);

		const decor = makeFolder(MapConfig.DECOR_FOLDER_NAME, Workspace);
		buildSpawnArea(decor);
		buildZoneDecor(decor);
		buildFinalArea(decor);
		buildEnvironment(decor);
		createAtmosphere();

		let parts = 0;
		for (const descendant of decor.GetDescendants()) if (descendant.IsA("BasePart")) parts++;
		log.debug(`Built decoration (${parts} parts)`);
		if (parts > MapConfig.MAX_DECOR_PARTS)
			log.warn(`Decoration has ${parts} parts (budget ${MapConfig.MAX_DECOR_PARTS})`);
		return folder;
	}

	/** Logical position (top-centre) of a tile: the same value AutoMovementService / MovementController use. */
	getTilePosition(step: number): Vector3 {
		return getStepPosition(step);
	}

	getTile(step: number): BasePart | undefined {
		const tile = this.folder?.FindFirstChild(`Tile_${step}`);
		return tile !== undefined && tile.IsA("BasePart") ? tile : undefined;
	}

	/**
	 * For future events (blackout, vanishing tiles…): hides or restores ONE tile
	 * without touching the rest of the map. The logical position is unchanged.
	 */
	setTileVisible(step: number, visible: boolean): void {
		const tile = this.getTile(step);
		if (tile === undefined) return;
		tile.Transparency = visible ? 0 : 1;
		tile.CanCollide = visible;
		for (const child of tile.GetDescendants()) {
			if (child.IsA("SurfaceGui")) child.Enabled = visible;
			else if (child.IsA("BasePart")) child.Transparency = visible ? 0 : 1;
		}
	}

	private createTile(step: number, parent: Folder): void {
		const zone = getZoneForStep(step);
		const width = getTileWidth(step);
		const length = PATH.TILE_SPACING - MapConfig.TILE_GAP;
		const isMilestone = step === 0 || step % 10 === 0 || step === zone.fromStep;
		// Odd tiles sit 0.02 higher so the corners where two turned tiles overlap never z-fight.
		const surface = getStepSurfaceCFrame(step).mul(new CFrame(0, (step % 2) * 0.02, 0));

		const tile = new Instance("Part");
		tile.Name = `Tile_${step}`;
		tile.Anchored = true;
		tile.Material = zone.tileMaterial;
		tile.TopSurface = Enum.SurfaceType.Smooth;
		tile.BottomSurface = Enum.SurfaceType.Smooth;
		tile.Size = new Vector3(width, PATH.TILE_THICKNESS, length);
		tile.CFrame = surface.mul(new CFrame(0, -PATH.TILE_THICKNESS / 2, 0));
		tile.Color = isMilestone ? this.milestoneColor(zone) : this.blendedColor(zone, step);
		tile.SetAttribute("Step", step);
		tile.SetAttribute("Zone", zone.id);
		CollectionService.AddTag(tile, MapConfig.TILE_TAG);

		this.createLabel(tile, step, width, zone, isMilestone);
		if (TRIM_ZONES.has(zone.id)) this.createTrims(tile, width, length, zone);

		tile.Parent = parent;
	}

	/** Alternating zone colour; the last two tiles drift toward the next zone's colour (a subtle transition). */
	private blendedColor(zone: ZoneDef, step: number): Color3 {
		const base = zone.tileColors[(step - zone.fromStep) % 2];
		const index = ZONES.indexOf(zone);
		const nextZone = ZONES[index + 1];
		const stepsLeft = zone.toStep - step;
		if (nextZone === undefined || stepsLeft > 1) return base;
		return base.Lerp(nextZone.tileColors[0], stepsLeft === 0 ? 0.3 : 0.15);
	}

	private milestoneColor(zone: ZoneDef): Color3 {
		return zone.tileColors[0].Lerp(zone.accentColor, 0.45);
	}

	private createLabel(tile: Part, step: number, width: number, zone: ZoneDef, isMilestone: boolean): void {
		const gui = new Instance("SurfaceGui");
		gui.Face = Enum.NormalId.Top;
		gui.LightInfluence = 0;
		gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud;
		gui.PixelsPerStud = 20;
		gui.Parent = tile;

		const label = new Instance("TextLabel");
		label.AnchorPoint = new Vector2(0.5, 0.5);
		label.Position = new UDim2(0.5, 0, 0.5, 0);
		// Square-ish box: the number never touches the edges, even on the narrow tiles.
		label.Size = new UDim2(math.min(0.6, (PATH.TILE_SPACING * 0.6) / width), 0, 0.62, 0);
		label.BackgroundTransparency = 1;
		label.Text = tostring(step);
		label.TextScaled = true;
		label.Font = Enum.Font.GothamBlack;
		label.TextColor3 = isMilestone && zone.id !== "Final" ? zone.accentColor : zone.textColor;
		label.TextStrokeColor3 = new Color3(0, 0, 0);
		label.TextStrokeTransparency = zone.id === "Beginning" || zone.id === "Sky" ? 0.85 : 0.55;
		label.Parent = gui;
	}

	private createTrims(tile: Part, width: number, length: number, zone: ZoneDef): void {
		for (const side of [-1, 1]) {
			const trim = makePart({
				name: "Trim",
				parent: tile,
				size: new Vector3(0.4, 0.2, length - 0.6),
				cframe: tile.CFrame.mul(new CFrame(side * (width / 2 - 0.3), PATH.TILE_THICKNESS / 2 + 0.1, 0)),
				color: zone.accentColor,
				material: Enum.Material.Neon,
				collide: false,
			});
			trim.CanQuery = false;
		}
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
