import { AutoMovementService } from "./services/AutoMovementService";
import { CheckpointService } from "./services/CheckpointService";
import { DataService } from "./services/DataService";
import { DonationService } from "./services/DonationService";
import { MapService } from "./services/MapService";
import { NoticeService } from "./services/NoticeService";
import { ProgressionService } from "./services/ProgressionService";
import { PurchasePromptService } from "./services/PurchasePromptService";
import { PurchaseService } from "./services/PurchaseService";
import { RewardService } from "./services/RewardService";
import { RubyService } from "./services/RubyService";
import { SkipService } from "./services/SkipService";
import { SupportService } from "./services/SupportService";

new MapService().build();

const data = new DataService();
const notices = new NoticeService();
const progression = new ProgressionService(data);
const rubies = new RubyService(data);
const support = new SupportService(data);
const purchases = new PurchaseService(data);
const prompts = new PurchasePromptService(data, progression, notices);
const rewards = new RewardService(); // no rewarded-ad provider is registered: the video route stays unavailable
const skips = new SkipService(progression, purchases, support, notices);
const donations = new DonationService(purchases, support, notices);
const checkpoints = new CheckpointService(data, progression, rubies, rewards, purchases, prompts, notices);
const movement = new AutoMovementService(progression);

progression.start();
rubies.start();
purchases.start();
skips.start();
donations.start();
prompts.start();
checkpoints.start();
movement.start();

// Last: every `loaded` subscriber above must be connected before players start loading.
data.start();
