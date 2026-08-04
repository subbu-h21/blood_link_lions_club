import { runCronJob } from "@/lib/cron/run";
import { notifyPrimaryForNoProspect } from "@/lib/db/escalation";

// PRD.md §9.2 row 1 (Unit 44) - see the Unit 44 migration's
// `cron.schedule('escalate-no-prospect', ...)` for what calls this.
export async function POST(request: Request) {
  return runCronJob(request, "escalate-no-prospect", async () => ({
    notifiedCount: await notifyPrimaryForNoProspect(),
  }));
}
