import { AutoMovementService } from "./services/AutoMovementService";
import { CheckpointService } from "./services/CheckpointService";
import { CompletionService } from "./services/CompletionService";
import { DataService } from "./services/DataService";
import { DonationService } from "./services/DonationService";
import { LeaderboardService } from "./services/LeaderboardService";
import { MapService } from "./services/MapService";
import { NoSkipService } from "./services/NoSkipService";
import { NoticeService } from "./services/NoticeService";
import { PlayTimeService } from "./services/PlayTimeService";
import { ProgressionService } from "./services/ProgressionService";
import { PurchasePromptService } from "./services/PurchasePromptService";
import { PurchaseService } from "./services/PurchaseService";
import { RewardService } from "./services/RewardService";
import { RubyService } from "./services/RubyService";
import { SkipService } from "./services/SkipService";
import { SupportService } from "./services/SupportService";
import { TitleService } from "./services/TitleService";
import { VictoryService } from "./services/VictoryService";

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
const playTime = new PlayTimeService(data);
const victories = new VictoryService(progression, data);
const leaderboards = new LeaderboardService(data, playTime);
const titles = new TitleService(data, playTime, notices, victories, support);
const noSkip = new NoSkipService(progression, titles);
const completion = new CompletionService(progression, victories, noSkip, titles);

progression.start();
rubies.start();
purchases.start();
skips.start();
donations.start();
prompts.start();
checkpoints.start();
movement.start();
playTime.start();
// Completion does not depend on the order of these calls: CompletionService is the only subscriber of
// `runCompleted` and explicitly asks VictoryService, NoSkipService and TitleService what they granted.
completion.start();
victories.start();
titles.start();
leaderboards.start();

// Last: every `loaded` subscriber above must be connected before players start loading.
data.start();
