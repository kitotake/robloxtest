/**
 * Small, reusable primitives for the generated map. Everything is built in the
 * "Full Stud" style: only axis-aligned blocks (no balls, cylinders or random
 * tilts), whole-stud dimensions and plastic surfaces. Decorative objects are
 * anchored Parts with collisions/queries disabled, so decoration never blocks
 * the automatic walk and never catches a player who falls.
 *
 * Blocks that are not rotated are snapped to the 1-stud grid (their edges land
 * on whole studs), so neighbouring blocks line up and studs never straddle.
 */

export interface PartOptions {
	name: string;
	parent: Instance;
	size: Vector3;
	cframe: CFrame;
	color: Color3;
	/** Defaults to Plastic (the classic Roblox look). Neon is kept for glowing accents only. */
	material?: Enum.Material;
	transparency?: number;
	/** Only the walkable surfaces (tiles, start/final platforms) collide. */
	collide?: boolean;
	castShadow?: boolean;
	/** Classic studs on the top face (ground-like blocks only: platforms, island tops). */
	studs?: boolean;
}

const EPSILON = 0.001;

function isUnrotated(cframe: CFrame): boolean {
	const [, , , r00, , , , r11, , , , r22] = cframe.GetComponents();
	return math.abs(r00 - 1) < EPSILON && math.abs(r11 - 1) < EPSILON && math.abs(r22 - 1) < EPSILON;
}

/** Centre on one axis so that both faces of a whole-stud block land on whole-stud coordinates. */
function snapAxis(centre: number, size: number): number {
	if (math.abs(size - math.round(size)) > EPSILON) return centre;
	return math.round(size) % 2 === 1 ? math.floor(centre) + 0.5 : math.round(centre);
}

function snapToGrid(cframe: CFrame, size: Vector3): CFrame {
	if (!isUnrotated(cframe)) return cframe;
	const position = cframe.Position;
	return new CFrame(snapAxis(position.X, size.X), snapAxis(position.Y, size.Y), snapAxis(position.Z, size.Z));
}

/** Whole number of studs, at least `min`. */
export function studs(value: number, min = 1): number {
	return math.max(min, math.round(value));
}

/** Same as studs() but forced to be even, so blocks stacked on a centre line stay aligned. */
export function evenStuds(value: number, min = 2): number {
	return math.max(min, 2 * math.round(value / 2));
}

export function makePart(options: PartOptions): Part {
	const part = new Instance("Part");
	part.Name = options.name;
	part.Anchored = true;
	part.Shape = Enum.PartType.Block;
	part.Size = options.size;
	part.CFrame = snapToGrid(options.cframe, options.size);
	part.Color = options.color;
	part.Material = options.material ?? Enum.Material.Plastic;
	part.Transparency = options.transparency ?? 0;
	part.TopSurface = options.studs === true ? Enum.SurfaceType.Studs : Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
	part.CanCollide = options.collide ?? false;
	part.CanTouch = options.collide ?? false;
	part.CanQuery = options.collide ?? false;
	part.CastShadow = options.castShadow ?? false;
	part.Parent = options.parent;
	return part;
}

export function makeModel(name: string, parent: Instance): Model {
	const model = new Instance("Model");
	model.Name = name;
	model.Parent = parent;
	return model;
}

export function makeFolder(name: string, parent: Instance): Folder {
	const folder = new Instance("Folder");
	folder.Name = name;
	folder.Parent = parent;
	return folder;
}

/** Cube of `side` studs centred on `center` (lamp bulbs, orbs, flowers, planets…). */
export function makeCube(
	parent: Instance,
	name: string,
	center: Vector3,
	side: number,
	color: Color3,
	material?: Enum.Material,
	transparency?: number,
): Part {
	const edge = studs(side);
	return makePart({
		name,
		parent,
		size: new Vector3(edge, edge, edge),
		cframe: new CFrame(center),
		color,
		material,
		transparency,
	});
}

/** Square vertical pillar: `bottom` is the centre of its lower face. */
export function makePillar(
	parent: Instance,
	name: string,
	bottom: Vector3,
	height: number,
	width: number,
	color: Color3,
	material?: Enum.Material,
	transparency?: number,
): Part {
	const h = studs(height);
	const w = studs(width);
	return makePart({
		name,
		parent,
		size: new Vector3(w, h, w),
		cframe: new CFrame(bottom.add(new Vector3(0, h / 2, 0))),
		color,
		material,
		transparency,
	});
}

/**
 * Flat floating island made of stacked square blocks: a studded top slab and
 * two narrower rock layers below it. `topCenter` is the middle of its top face.
 */
export function makeIsland(
	parent: Instance,
	topCenter: Vector3,
	diameter: number,
	topColor: Color3,
	rockColor: Color3,
): Model {
	const model = makeModel("Island", parent);
	const width = evenStuds(diameter, 4);
	const middleWidth = width - 2;
	const lowWidth = math.max(2, width - 2 * math.max(2, math.floor(width / 4)));
	const middleHeight = math.max(2, 2 * math.round(width / 12));
	const lowHeight = math.max(2, 2 * math.round(width / 8));

	makePart({
		name: "Top",
		parent: model,
		size: new Vector3(width, 2, width),
		cframe: new CFrame(topCenter.sub(new Vector3(0, 1, 0))),
		color: topColor,
		studs: true,
	});
	makePart({
		name: "Rock",
		parent: model,
		size: new Vector3(middleWidth, middleHeight, middleWidth),
		cframe: new CFrame(topCenter.sub(new Vector3(0, 2 + middleHeight / 2, 0))),
		color: rockColor,
	});
	makePart({
		name: "RockLow",
		parent: model,
		size: new Vector3(lowWidth, lowHeight, lowWidth),
		cframe: new CFrame(topCenter.sub(new Vector3(0, 2 + middleHeight + lowHeight / 2, 0))),
		color: rockColor,
	});
	return model;
}

/** Blocky tree: square trunk and a two-tier cube canopy. `base` = centre of the trunk's lower face. */
export function makeTree(parent: Instance, base: Vector3, height: number, leaf: Color3): void {
	const trunkHeight = evenStuds(height, 4);
	makePillar(parent, "Trunk", base, trunkHeight, 2, rgb(115, 82, 52));
	const canopy = evenStuds(trunkHeight * 0.8, 4);
	const canopyHeight = evenStuds(canopy * 0.6, 2);
	const top = base.add(new Vector3(0, trunkHeight, 0));
	makePart({
		name: "Leaves",
		parent,
		size: new Vector3(canopy, canopyHeight, canopy),
		cframe: new CFrame(top.add(new Vector3(0, canopyHeight / 2, 0))),
		color: leaf,
	});
	makePart({
		name: "LeavesTop",
		parent,
		size: new Vector3(canopy - 2, 2, canopy - 2),
		cframe: new CFrame(top.add(new Vector3(0, canopyHeight + 1, 0))),
		color: leaf,
	});
}

const CLOUD_BLOCKS: readonly [number, number, number, number, number, number][] = [
	// x, y, z, width, height, depth (at scale 1)
	[0, 0, 0, 18, 4, 10],
	[-3, 3, 0, 10, 3, 8],
	[5, 3, 1, 8, 3, 6],
];

/** Cloud = three stacked white slabs. */
export function makeCloud(parent: Instance, center: Vector3, scale: number, color: Color3, transparency = 0.1): Model {
	const model = makeModel("Cloud", parent);
	for (const [x, y, z, w, h, d] of CLOUD_BLOCKS) {
		makePart({
			name: "Puff",
			parent: model,
			size: new Vector3(evenStuds(w * scale), math.max(2, studs(h * scale)), evenStuds(d * scale)),
			cframe: new CFrame(center.add(new Vector3(x, y, z).mul(scale))),
			color,
			transparency,
		});
	}
	return model;
}

/** Text on one face of a part (signs, gates, boards). */
export function addFaceText(
	part: BasePart,
	face: Enum.NormalId,
	text: string,
	textColor: Color3,
	strokeColor: Color3 = new Color3(0, 0, 0),
	font: Enum.Font = Enum.Font.GothamBlack,
): void {
	const gui = new Instance("SurfaceGui");
	gui.Face = face;
	gui.LightInfluence = 0;
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud;
	gui.PixelsPerStud = 30;
	gui.Parent = part;

	const label = new Instance("TextLabel");
	label.AnchorPoint = new Vector2(0.5, 0.5);
	label.Position = new UDim2(0.5, 0, 0.5, 0);
	label.Size = new UDim2(0.92, 0, 0.8, 0);
	label.BackgroundTransparency = 1;
	label.Text = text;
	label.TextScaled = true;
	label.Font = font;
	label.TextColor3 = textColor;
	label.TextStrokeColor3 = strokeColor;
	label.TextStrokeTransparency = 0.4;
	label.Parent = gui;
}

export type RingPlane = "vertical" | "flat";

/**
 * Rectangular frame of four square bars (replaces the former segmented ring).
 * "vertical" stands across the path (a gate / halo seen from the approach),
 * "flat" lies horizontally. `radius` is the half-width of the frame (centre of
 * the bars), `centre` a world position, `frame` only provides the orientation.
 * `skipBottom` leaves a vertical frame open at the bottom (a walk-through arch).
 */
export function makeFrame(
	parent: Instance,
	frame: CFrame,
	centre: Vector3,
	radius: number,
	thickness: number,
	color: Color3,
	material: Enum.Material,
	plane: RingPlane = "vertical",
	transparency = 0,
	name = "Frame",
	skipBottom = false,
): void {
	const half = studs(radius);
	const t = studs(thickness);
	const rotation = frame.Rotation;
	const bar = (size: Vector3, offset: Vector3): void => {
		makePart({
			name,
			parent,
			size,
			cframe: new CFrame(centre.add(rotation.PointToWorldSpace(offset))).mul(rotation),
			color,
			material,
			transparency,
		});
	};

	if (plane === "vertical") {
		bar(new Vector3(2 * half + t, t, t), new Vector3(0, half, 0));
		if (!skipBottom) bar(new Vector3(2 * half + t, t, t), new Vector3(0, -half, 0));
		for (const side of [-1, 1]) bar(new Vector3(t, 2 * half + t, t), new Vector3(side * half, 0, 0));
	} else {
		for (const side of [-1, 1]) {
			bar(new Vector3(2 * half + t, t, t), new Vector3(0, 0, side * half));
			bar(new Vector3(t, t, 2 * half - t), new Vector3(side * half, 0, 0));
		}
	}
}

/** Three straight neon spikes of different heights standing on `base` (centre of their lower end). */
export function makeCrystalCluster(parent: Instance, base: Vector3, scale: number, color: Color3, rng: Random): void {
	const width = studs(scale);
	for (let i = 0; i < 3; i++) {
		const height = studs(rng.NextNumber(3, 6.5) * scale, 2);
		const offset = new Vector3(rng.NextInteger(-2, 2) * width, 0, rng.NextInteger(-2, 2) * width);
		makePart({
			name: "Crystal",
			parent,
			size: new Vector3(width, height, width),
			cframe: new CFrame(base.add(offset).add(new Vector3(0, height / 2, 0))),
			color,
			material: Enum.Material.Neon,
			transparency: 0.1,
		});
	}
}

/** Angular rock: a wide base block with a smaller block on top. `size` is the base width. */
export function makeRock(
	parent: Instance,
	centre: Vector3,
	size: number,
	color: Color3,
	material: Enum.Material,
	rng: Random,
): Part {
	const width = evenStuds(size, 2);
	const baseHeight = studs(width * rng.NextNumber(0.6, 0.9), 2);
	const base = makePart({
		name: "Rock",
		parent,
		size: new Vector3(width, baseHeight, width),
		cframe: new CFrame(centre),
		color,
		material,
	});
	const capWidth = math.max(2, width - 2);
	makePart({
		name: "RockTop",
		parent,
		size: new Vector3(capWidth, 2, capWidth),
		cframe: new CFrame(centre.add(new Vector3(0, baseHeight / 2 + 1, 0))),
		color,
		material,
	});
	return base;
}

/** Glowing vertical strip set into the +Z face of a rock (lava crack, ember vein). Uses the rock's real (grid-snapped) position. */
export function addGlowStrip(rock: Part, color: Color3): void {
	makePart({
		name: "LavaCrack",
		parent: rock.Parent as Instance,
		size: new Vector3(2, math.max(1, rock.Size.Y - 1), 1),
		cframe: new CFrame(rock.Position.add(new Vector3(0, 0, rock.Size.Z / 2))),
		color,
		material: Enum.Material.Neon,
	});
}

/** Straight zig-zag lightning bolt made of vertical and horizontal neon bars. `top` = start of the bolt. */
export function makeBolt(parent: Instance, top: Vector3, rng: Random, color: Color3): void {
	let from = top;
	for (let i = 0; i < 4; i++) {
		const length = studs(rng.NextNumber(8, 12), 4);
		makePart({
			name: "Bolt",
			parent,
			size: new Vector3(1, length, 1),
			cframe: new CFrame(from.sub(new Vector3(0, length / 2, 0))),
			color,
			material: Enum.Material.Neon,
		});
		from = from.sub(new Vector3(0, length, 0));
		const dx = rng.NextInteger(-1, 1) * rng.NextInteger(2, 4);
		if (dx !== 0) {
			makePart({
				name: "Bolt",
				parent,
				size: new Vector3(math.abs(dx) + 1, 1, 1),
				cframe: new CFrame(from.add(new Vector3(dx / 2, 0.5, 0))),
				color,
				material: Enum.Material.Neon,
			});
			from = from.add(new Vector3(dx, 0, 0));
		}
	}
}

/** Invisible box that holds a ParticleEmitter (emission volume = the part's size). */
export function makeEmitterAnchor(parent: Instance, name: string, centre: Vector3, size: Vector3): Part {
	return makePart({ name, parent, size, cframe: new CFrame(centre), color: new Color3(1, 1, 1), transparency: 1 });
}

/** Column with a square base and a neon cap. `bottom` = centre of the lower face. */
export function makeColumn(
	parent: Instance,
	bottom: Vector3,
	height: number,
	diameter: number,
	color: Color3,
	capColor: Color3,
): void {
	const width = evenStuds(diameter, 2);
	const h = studs(height);
	makePillar(parent, "Column", bottom, h, width, color);
	makePart({
		name: "ColumnCap",
		parent,
		size: new Vector3(width + 2, 1, width + 2),
		cframe: new CFrame(bottom.add(new Vector3(0, h + 0.5, 0))),
		color: capColor,
		material: Enum.Material.Neon,
	});
}

function rgb(r: number, g: number, b: number): Color3 {
	return Color3.fromRGB(r, g, b);
}
