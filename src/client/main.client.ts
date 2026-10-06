import { DonateUIController } from "./controllers/DonateUIController";
import { FriendsController } from "./controllers/FriendsController";
import { MovementController } from "./controllers/MovementController";
import { NoticeController } from "./controllers/NoticeController";
import { ProgressUIController } from "./controllers/ProgressUIController";
import { RubyUIController } from "./controllers/RubyUIController";
import { SkipUIController } from "./controllers/SkipUIController";
import { ProgressStore } from "./stores/ProgressStore";
import { RubyStore } from "./stores/RubyStore";

const progressStore = new ProgressStore();
const rubyStore = new RubyStore();
const friends = new FriendsController();

progressStore.start();
rubyStore.start();
friends.start();

new MovementController(progressStore).start();
new ProgressUIController(progressStore, friends).start();
new NoticeController().start();
new SkipUIController().start();
new RubyUIController(rubyStore).start();
new DonateUIController().start();
