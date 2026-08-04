import { runCronJob } from "@/lib/cron/run";
import { autoExpireIdleRequests } from "@/lib/db/requests";

// Scheduled job (3) of 3 (Unit 31) - see the Unit 31 migration's
// `cron.schedule('expire-idle-requests', ...)` for what actually calls this.
export async function POST(request: Request) {
  return runCronJob(request, "expire-requests", async () => ({
    expiredCount: await autoExpireIdleRequests(),
  }));
}
