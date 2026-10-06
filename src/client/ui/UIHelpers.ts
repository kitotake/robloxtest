export function addCorner(parent: GuiObject, radius: UDim): UICorner {
	const corner = new Instance("UICorner");
	corner.CornerRadius = radius;
	corner.Parent = parent;
	return corner;
}

export function addStroke(parent: GuiObject, color: Color3, thickness: number): UIStroke {
	const stroke = new Instance("UIStroke");
	stroke.Color = color;
	stroke.Thickness = thickness;
	stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
	stroke.Parent = parent;
	return stroke;
}
