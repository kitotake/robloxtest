/**
 * Minimal typed signal used for decoupling services/controllers.
 *
 * Contract: `fire` starts every connected handler synchronously, in the order
 * they were connected, each in its own thread (so a handler that errors or
 * yields never blocks the others). Handlers are kept in an ordered list on
 * purpose: a Set of functions is a table keyed by functions in Luau, and its
 * iteration order is unspecified. Even so, no game rule should rely on the
 * order of handlers; a result that several services contribute to must be
 * gathered explicitly by one owner (see CompletionService).
 */
export class Signal<T extends unknown[] = []> {
	private handlers: Array<(...args: T) => void> = [];

	connect(handler: (...args: T) => void): () => void {
		if (!this.handlers.includes(handler)) {
			// A new array on every change: a `fire` in progress keeps iterating its own snapshot.
			const updated = [...this.handlers];
			updated.push(handler);
			this.handlers = updated;
		}
		return () => {
			this.handlers = this.handlers.filter((connected) => connected !== handler);
		};
	}

	fire(...args: T): void {
		const snapshot = this.handlers;
		for (const handler of snapshot) {
			// A handler disconnected by an earlier handler of this same fire is skipped.
			if (this.handlers.includes(handler)) task.spawn(handler, ...args);
		}
	}
}
