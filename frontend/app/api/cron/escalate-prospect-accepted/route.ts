import { runCronJob } from "@/lib/cron/run";
import { notifyPrimaryForProspectAccepted } from "@/lib/db/escalation";

// PRD.md §9.2 row 2 (Unit 44) - see the Unit 44 migration's
// `cron.schedule('escalate-prospect-accepted', ...)` for what calls this.
export async function POST(request: Request) {
  return runCronJob(request, "escalate-prospect-accepted", async () => ({
    notifiedCount: await notifyPrimaryForProspectAccepted(),
  }));
}
