import { RubyStore } from "../stores/RubyStore";
import { addCorner, addStroke } from "../ui/UIHelpers";
import { getSideBar } from "../ui/Hud";

/** Ruby balance pill at the top of the side bar. */
export class RubyUIController {
	constructor(private readonly store: RubyStore) {}

	start(): void {
		const pill = new Instance("TextLabel");
		pill.Name = "Rubies";
		pill.LayoutOrder = 1;
		pill.Size = new UDim2(0, 104, 0, 36);
		pill.BackgroundColor3 = Color3.fromRGB(30, 34, 52);
		pill.Font = Enum.Font.GothamBold;
		pill.TextSize = 16;
		pill.TextColor3 = Color3.fromRGB(255, 120, 150);
		pill.Parent = getSideBar();
		addCorner(pill, new UDim(0, 10));
		addStroke(pill, Color3.fromRGB(255, 255, 255), 1.5).Transparency = 0.6;

		const render = (balance: number) => {
			pill.Text = `💎 ${balance}`;
		};
		render(this.store.get());
		this.store.changed.connect(render);
	}
}
