import { CheckpointUIController } from "./controllers/CheckpointUIController";
import { DonateUIController } from "./controllers/DonateUIController";
import { FriendsController } from "./controllers/FriendsController";
import { MovementController } from "./controllers/MovementController";
import { NoticeController } from "./controllers/NoticeController";
import { ProgressUIController } from "./controllers/ProgressUIController";
import { RubyUIController } from "./controllers/RubyUIController";
import { SkipUIController } from "./controllers/SkipUIController";
import { CameraController } from "./controllers/CameraController";
import { ZoneAtmosphereController } from "./controllers/ZoneAtmosphereController";
import { CheckpointStore } from "./stores/CheckpointStore";
import { ProgressStore } from "./stores/ProgressStore";
import { RubyStore } from "./stores/RubyStore";

const progressStore = new ProgressStore();
const rubyStore = new RubyStore();
const checkpointStore = new CheckpointStore();
const friends = new FriendsController();

progressStore.start();
rubyStore.start();
checkpointStore.start();
friends.start();

new MovementController(progressStore).start();
new ZoneAtmosphereController(progressStore).start();
new CameraController().start();
new ProgressUIController(progressStore, friends).start();
new NoticeController().start();
new SkipUIController().start();
new RubyUIController(rubyStore).start();
new DonateUIController().start();
new CheckpointUIController(progressStore, checkpointStore).start();
