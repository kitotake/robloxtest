/** Every dynamic event of the game. The server owns the list; a client can never invent one. */
export type EventId = "Blackout" | "SpeedBoost" | "Storm";

/** Why an event ended. "Expired" is the only natural end. */
export type EventStopReason = "Expired" | "Died" | "Respawn" | "Reset" | "Completed" | "Left";

/** Server → one client. Carries no parameter: the client reads its look from the shared config. */
export interface EventMessage {
	eventId: EventId;
	state: "Start" | "Stop";
	/** Remaining seconds for "Start" (an upper bound the client never extends); 0 for "Stop". */
	durationSeconds: number;
}
