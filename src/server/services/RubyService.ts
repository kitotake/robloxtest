import { getRemoteEvent, getRemoteFunction, RemoteNames } from "shared/remotes";
import { createLogger } from "shared/util/Logger";
import { Signal } from "shared/util/Signal";
import { DataService } from "./DataService";

const log = createLogger("RubyService");

/** Ruby (gem) balance. Server-authoritative; clients only receive the balance for display. */
export class RubyService {
	/** (player, newBalance) */
	readonly changed = new Signal<[player: Player, balance: number]>();

	private readonly rubiesChanged = getRemoteEvent(RemoteNames.RubiesChanged);
	private readonly balanceRequest = getRemoteFunction(RemoteNames.GetRubies);

	constructor(private readonly data: DataService) {}

	start(): void {
		this.balanceRequest.OnServerInvoke = (player) => this.getBalance(player);
		this.data.loaded.connect((player) => this.rubiesChanged.FireClient(player, this.getBalance(player)));
	}

	getBalance(player: Player): number {
		return this.data.getData(player)?.rubies ?? 0;
	}

	hasEnough(player: Player, amount: number): boolean {
		return this.isValidAmount(amount) && this.getBalance(player) >= amount;
	}

	add(player: Player, amount: number): boolean {
		const saved = this.data.getData(player);
		if (saved === undefined || !this.isValidAmount(amount)) return false;
		saved.rubies += amount;
		this.publish(player, saved.rubies);
		return true;
	}

	/** Fails (and changes nothing) if the balance is insufficient. */
	remove(player: Player, amount: number): boolean {
		const saved = this.data.getData(player);
		if (saved === undefined || !this.isValidAmount(amount) || saved.rubies < amount) return false;
		saved.rubies -= amount;
		this.publish(player, saved.rubies);
		return true;
	}

	private isValidAmount(amount: number): boolean {
		return amount === amount && amount > 0 && math.floor(amount) === amount;
	}

	private publish(player: Player, balance: number): void {
		log.debug(`${player.Name} rubies -> ${balance}`);
		this.rubiesChanged.FireClient(player, balance);
		this.changed.fire(player, balance);
	}
}
