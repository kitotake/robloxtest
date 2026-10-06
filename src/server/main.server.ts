import { AutoMovementService } from "./services/AutoMovementService";
import { DataService } from "./services/DataService";
import { DonationService } from "./services/DonationService";
import { MapService } from "./services/MapService";
import { NoticeService } from "./services/NoticeService";
import { ProgressionService } from "./services/ProgressionService";
import { PurchasePromptService } from "./services/PurchasePromptService";
import { PurchaseService } from "./services/PurchaseService";
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
const skips = new SkipService(progression, purchases, support, notices);
const donations = new DonationService(purchases, support, notices);
const prompts = new PurchasePromptService(data, progression, notices);
const movement = new AutoMovementService(progression);

progression.start();
rubies.start();
purchases.start();
skips.start();
donations.start();
prompts.start();
movement.start();

// Last: every `loaded` subscriber above must be connected before players start loading.
data.start();
