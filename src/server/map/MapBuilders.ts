/**
 * Small, reusable primitives for the generated map: every decorative object is
 * made of simple anchored Parts with collisions/queries disabled, so decoration
 * never blocks the automatic walk and never catches a player who falls.
 */

export interface PartOptions {
	name: string;
	parent: Instance;
	size: Vector3;
	cframe: CFrame;
	color: Color3;
	material?: Enum.Material;
	shape?: Enum.PartType;
	transparency?: number;
	/** Only the walkable surfaces (tiles, start/final platforms) collide. */
	collide?: boolean;
	castShadow?: boolean;
}

export function makePart(options: PartOptions): Part {
	const part = new Instance("Part");
	part.Name = options.name;
	part.Anchored = true;
	part.Size = options.size;
	part.CFrame = options.cframe;
	part.Color = options.color;
	part.Material = options.material ?? Enum.Material.SmoothPlastic;
	part.Shape = options.shape ?? Enum.PartType.Block;
	part.Transparency = options.transparency ?? 0;
	part.TopSurface = Enum.SurfaceType.Smooth;
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

/** Vertical cylinder: `bottom` is the centre of its lower face. */
export function makePillar(
	parent: Instance,
	name: string,
	bottom: Vector3,
	height: number,
	diameter: number,
	color: Color3,
	material?: Enum.Material,
	transparency?: number,
): Part {
	return makePart({
		name,
		parent,
		size: new Vector3(height, diameter, diameter),
		cframe: new CFrame(bottom.add(new Vector3(0, height / 2, 0))).mul(CFrame.Angles(0, 0, math.pi / 2)),
		color,
		material,
		shape: Enum.PartType.Cylinder,
		transparency,
	});
}

export function makeBall(
	parent: Instance,
	name: string,
	center: Vector3,
	diameter: number,
	color: Color3,
	material?: Enum.Material,
	transparency?: number,
): Part {
	return makePart({
		name,
		parent,
		size: new Vector3(diameter, diameter, diameter),
		cframe: new CFrame(center),
		color,
		material,
		shape: Enum.PartType.Ball,
		transparency,
	});
}

/** Flat floating island: `topCenter` is the middle of its top surface. */
export function makeIsland(
	parent: Instance,
	topCenter: Vector3,
	diameter: number,
	topColor: Color3,
	rockColor: Color3,
): Model {
	const model = makeModel("Island", parent);
	const thickness = 2;
	makePart({
		name: "Top",
		parent: model,
		size: new Vector3(thickness, diameter, diameter),
		cframe: new CFrame(topCenter.sub(new Vector3(0, thickness / 2, 0))).mul(CFrame.Angles(0, 0, math.pi / 2)),
		color: topColor,
		material: Enum.Material.Grass,
		shape: Enum.PartType.Cylinder,
	});
	makePart({
		name: "Rock",
		parent: model,
		size: new Vector3(diameter * 0.8, diameter * 0.7, diameter * 0.8),
		cframe: new CFrame(topCenter.sub(new Vector3(0, thickness + diameter * 0.25, 0))),
		color: rockColor,
		material: Enum.Material.Slate,
		shape: Enum.PartType.Ball,
	});
	return model;
}

export function makeCloud(parent: Instance, center: Vector3, scale: number, color: Color3, transparency = 0.1): Model {
	const model = makeModel("Cloud", parent);
	const puffs: [number, number, number, number][] = [
		[0, 0, 0, 14],
		[9, -1.5, 2, 10],
		[-9, -1.5, -1, 10],
		[3, 3, -3, 9],
	];
	for (const [x, y, z, d] of puffs) {
		makeBall(model, "Puff", center.add(new Vector3(x, y, z).mul(scale)), d * scale, color, undefined, transparency);
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
 * Ring of box segments. "vertical" stands across the path (an arch / halo seen
 * from the approach), "flat" lies horizontally. `centre` is a world position,
 * `frame` only provides the orientation.
 */
export function makeRing(
	parent: Instance,
	frame: CFrame,
	centre: Vector3,
	radius: number,
	segments: number,
	thickness: number,
	color: Color3,
	material: Enum.Material,
	plane: RingPlane = "vertical",
	transparency = 0,
	name = "Ring",
): void {
	const chord = 2 * radius * math.sin(math.pi / segments) * 1.06;
	for (let i = 0; i < segments; i++) {
		const angle = (i / segments) * 2 * math.pi;
		const offset =
			plane === "vertical"
				? new Vector3(math.cos(angle) * radius, math.sin(angle) * radius, 0)
				: new Vector3(math.cos(angle) * radius, 0, math.sin(angle) * radius);
		const spin =
			plane === "vertical"
				? CFrame.Angles(0, 0, angle + math.pi / 2)
				: CFrame.Angles(0, -(angle + math.pi / 2), 0);
		makePart({
			name,
			parent,
			size: new Vector3(chord, thickness, thickness),
			cframe: new CFrame(centre.add(frame.Rotation.PointToWorldSpace(offset))).mul(frame.Rotation).mul(spin),
			color,
			material,
			transparency,
		});
	}
}

/** Three leaning neon crystals standing on `base` (centre of their lower end). */
export function makeCrystalCluster(parent: Instance, base: Vector3, scale: number, color: Color3, rng: Random): void {
	for (let i = 0; i < 3; i++) {
		const height = rng.NextNumber(3, 6.5) * scale;
		const offset = new Vector3(rng.NextNumber(-1.4, 1.4) * scale, 0, rng.NextNumber(-1.4, 1.4) * scale);
		const lean = CFrame.Angles(rng.NextNumber(-0.3, 0.3), rng.NextNumber(0, math.pi), rng.NextNumber(-0.3, 0.3));
		makePart({
			name: "Crystal",
			parent,
			size: new Vector3(0.9 * scale, height, 0.9 * scale),
			cframe: new CFrame(base.add(offset).add(new Vector3(0, height / 2, 0))).mul(lean),
			color,
			material: Enum.Material.Neon,
			transparency: 0.1,
		});
	}
}

export function makeRock(
	parent: Instance,
	centre: Vector3,
	size: number,
	color: Color3,
	material: Enum.Material,
	rng: Random,
): Part {
	return makePart({
		name: "Rock",
		parent,
		size: new Vector3(size, size * rng.NextNumber(0.6, 0.9), size * rng.NextNumber(0.8, 1)),
		cframe: new CFrame(centre).mul(
			CFrame.Angles(rng.NextNumber(0, math.pi), rng.NextNumber(0, math.pi), rng.NextNumber(0, math.pi)),
		),
		color,
		material,
	});
}

/** Invisible box that holds a ParticleEmitter (emission volume = the part's size). */
export function makeEmitterAnchor(parent: Instance, name: string, centre: Vector3, size: Vector3): Part {
	return makePart({ name, parent, size, cframe: new CFrame(centre), color: new Color3(1, 1, 1), transparency: 1 });
}

/** Marble-style column with a base and a cap. `bottom` = centre of the lower face. */
export function makeColumn(
	parent: Instance,
	bottom: Vector3,
	height: number,
	diameter: number,
	color: Color3,
	capColor: Color3,
): void {
	makePillar(parent, "Column", bottom, height, diameter, color, Enum.Material.Marble);
	makePart({
		name: "ColumnCap",
		parent,
		size: new Vector3(diameter * 1.6, 1, diameter * 1.6),
		cframe: new CFrame(bottom.add(new Vector3(0, height + 0.5, 0))),
		color: capColor,
		material: Enum.Material.Neon,
	});
}
