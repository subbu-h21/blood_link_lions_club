import { runCronJob } from "@/lib/cron/run";
import { notifyPrimaryForZeroMatch } from "@/lib/db/escalation";

// PRD.md §9.2 row 3 (Unit 44) - see the Unit 44 migration's
// `cron.schedule('escalate-zero-match', ...)` for what calls this. The
// real consumer of Unit 22's `zero_match_at` signal, flagged as an open
// gap at Unit 32's own M3 review gate.
export async function POST(request: Request) {
  return runCronJob(request, "escalate-zero-match", async () => ({
    notifiedCount: await notifyPrimaryForZeroMatch(),
  }));
}
