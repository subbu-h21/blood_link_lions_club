import { runCronJob } from "@/lib/cron/run";
import { escalateToCoordinatorForSecondaryInaction } from "@/lib/db/escalation";

// PRD.md §9.2 row 5 (Unit 44) - see the Unit 44 migration's
// `cron.schedule('escalate-secondary-inaction', ...)` for what calls this.
export async function POST(request: Request) {
  return runCronJob(request, "escalate-secondary-inaction", async () => ({
    escalatedCount: await escalateToCoordinatorForSecondaryInaction(),
  }));
}
