import { runCronJob } from "@/lib/cron/run";
import { escalateToSecondaryForAdminInaction } from "@/lib/db/escalation";

// PRD.md §9.2 row 4 (Unit 44) - see the Unit 44 migration's
// `cron.schedule('escalate-admin-inaction', ...)` for what calls this.
export async function POST(request: Request) {
  return runCronJob(request, "escalate-admin-inaction", async () => ({
    escalatedCount: await escalateToSecondaryForAdminInaction(),
  }));
}
