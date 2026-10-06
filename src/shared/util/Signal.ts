/** Minimal typed signal used for decoupling services/controllers. */
export class Signal<T extends unknown[] = []> {
	private readonly handlers = new Set<(...args: T) => void>();

	connect(handler: (...args: T) => void): () => void {
		this.handlers.add(handler);
		return () => {
			this.handlers.delete(handler);
		};
	}

	fire(...args: T): void {
		for (const handler of this.handlers) {
			task.spawn(handler, ...args);
		}
	}
}
