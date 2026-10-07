import { ReplicatedStorage, RunService } from "@rbxts/services";

const FOLDER_NAME = "Remotes";

export const RemoteNames = {
	/** Server → clients: (userId: number, step: number) */
	ProgressChanged: "ProgressChanged",
	/** Client → server: returns ProgressEntry[] */
	GetProgressSnapshot: "GetProgressSnapshot",
	/** Server → one client: (balance: number) */
	RubiesChanged: "RubiesChanged",
	/** Client → server: returns the caller's ruby balance */
	GetRubies: "GetRubies",
	/** Client → server: (kind: "Skip" | "Donation", optionId: string). The server decides everything. */
	RequestPurchase: "RequestPurchase",
	/** Server → one client: (kind: "info" | "error", text: string) */
	Notice: "Notice",
	/** Server → one client: (info: CheckpointInfo) */
	CheckpointChanged: "CheckpointChanged",
	/** Client → server: returns the caller's CheckpointInfo */
	GetCheckpointInfo: "GetCheckpointInfo",
	/** Client → server: (action: CheckpointAction). Carries no step, price or amount. */
	CheckpointAction: "CheckpointAction",
} as const;

function getFolder(): Folder {
	if (RunService.IsServer()) {
		let folder = ReplicatedStorage.FindFirstChild(FOLDER_NAME) as Folder | undefined;
		if (folder === undefined) {
			folder = new Instance("Folder");
			folder.Name = FOLDER_NAME;
			folder.Parent = ReplicatedStorage;
		}
		return folder;
	}
	return ReplicatedStorage.WaitForChild(FOLDER_NAME) as Folder;
}

/** Server creates the remote on first call, client waits for it. */
export function getRemoteEvent(name: string): RemoteEvent {
	const folder = getFolder();
	if (RunService.IsServer()) {
		let remote = folder.FindFirstChild(name) as RemoteEvent | undefined;
		if (remote === undefined) {
			remote = new Instance("RemoteEvent");
			remote.Name = name;
			remote.Parent = folder;
		}
		return remote;
	}
	return folder.WaitForChild(name) as RemoteEvent;
}

export function getRemoteFunction(name: string): RemoteFunction {
	const folder = getFolder();
	if (RunService.IsServer()) {
		let remote = folder.FindFirstChild(name) as RemoteFunction | undefined;
		if (remote === undefined) {
			remote = new Instance("RemoteFunction");
			remote.Name = name;
			remote.Parent = folder;
		}
		return remote;
	}
	return folder.WaitForChild(name) as RemoteFunction;
}
