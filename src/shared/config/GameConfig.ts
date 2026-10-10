/**
 * Central gameplay configuration. Every tunable value lives here (or in a
 * sibling config file) so that no gameplay number is hardcoded in services.
 */
export const GameConfig = {
	/** When false, debug logging is silent. */
	DEBUG: true,

	/** Last step of the run (0 → MAX_STEP). */
	MAX_STEP: 100,

	/** Seconds the server waits before automatically advancing one step. */
	STEP_INTERVAL_SECONDS: 4,

	/** Whether progression may ever decrease through SetProgress. */
	ALLOW_BACKWARD_MOVEMENT: false,

	/** Disable WASD / thumbstick so the player is moved only by the game. */
	DISABLE_MANUAL_CONTROLS: true,

	/**
	 * Once a player reaches MAX_STEP the automatic walk ends: manual controls come
	 * back and the avatar uses this (normal) walk speed on the final platform.
	 */
	FREE_WALK_SPEED: 16,

	PATH: {
		/** Workspace folder holding the numbered tiles. */
		FOLDER_NAME: "ProgressPath",
		/** Top-centre of tile 0. */
		START_POSITION: new Vector3(0, 10, 0),
		/** Direction of travel (unit vector). */
		DIRECTION: new Vector3(0, 0, -1),
		/** Distance between two consecutive tile centres (studs). */
		TILE_SPACING: 12,
		/** Tile width perpendicular to the direction of travel (studs). */
		TILE_WIDTH: 16,
		TILE_THICKNESS: 1,
	},

	CHARACTER: {
		/** Height above the tile surface when (re)placing a character. */
		SPAWN_HEIGHT: 4,
	},

	/**
	 * Falling or dying is a physical event, never a progression change: the step
	 * is untouched and nothing teleports a living player back to the path.
	 */
	RESPAWN: {
		/**
		 * true: a (re)spawning character is placed on the tile of its last
		 * server-validated step. false: Roblox's default spawn (tile 0) is used.
		 */
		PLACE_AT_PROGRESS: true,
	},

	DATA: {
		/** DataStore name. Bump the suffix only for a deliberate data reset. */
		STORE_NAME: "PlayerData_v1",
		KEY_PREFIX: "Player_",
		AUTOSAVE_INTERVAL_SECONDS: 60,
		LOAD_ATTEMPTS: 5,
		SAVE_ATTEMPTS: 3,
		RETRY_DELAY_SECONDS: 2,
		/** A session lock older than this is considered abandoned (crashed server). */
		SESSION_LOCK_TIMEOUT_SECONDS: 300,
		SHUTDOWN_MAX_WAIT_SECONDS: 25,
		/**
		 * In Roblox Studio, if the DataStore is unreachable (API access disabled),
		 * play with temporary data that is never saved instead of kicking.
		 * Never applies to live servers.
		 */
		ALLOW_STUDIO_FALLBACK: true,
	},
} as const;
