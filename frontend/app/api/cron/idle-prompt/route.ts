import { runCronJob } from "@/lib/cron/run";
import { markIdleRequestsForPrompt } from "@/lib/db/requests";

// Scheduled job (2) of 3 (Unit 31) - see the Unit 31 migration's
// `cron.schedule('idle-request-prompt', ...)` for what actually calls this.
export async function POST(request: Request) {
  return runCronJob(request, "idle-prompt", async () => ({
    promptedCount: await markIdleRequestsForPrompt(),
  }));
}
