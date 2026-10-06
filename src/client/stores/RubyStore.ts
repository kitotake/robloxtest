import { getRemoteEvent, getRemoteFunction, RemoteNames } from "shared/remotes";
import { Signal } from "shared/util/Signal";

/** Read-only client mirror of the ruby balance (display only). */
export class RubyStore {
	readonly changed = new Signal<[balance: number]>();
	private balance = 0;
	private received = false;

	start(): void {
		getRemoteEvent(RemoteNames.RubiesChanged).OnClientEvent.Connect((balance: number) => this.set(balance));

		task.spawn(() => {
			const balance = getRemoteFunction(RemoteNames.GetRubies).InvokeServer() as number;
			if (!this.received) this.set(balance);
		});
	}

	get(): number {
		return this.balance;
	}

	private set(balance: number): void {
		this.received = true;
		this.balance = balance;
		this.changed.fire(balance);
	}
}
