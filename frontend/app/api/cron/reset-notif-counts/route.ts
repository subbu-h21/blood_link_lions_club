import { runCronJob } from "@/lib/cron/run";
import { resetStaleNotifCounts } from "@/lib/db/donors";

// Scheduled job (1) of 3 (Unit 31) - see the Unit 31 migration's
// `cron.schedule('reset-notif-counts', ...)` for what actually calls this.
export async function POST(request: Request) {
  return runCronJob(request, "reset-notif-counts", async () => ({
    resetCount: await resetStaleNotifCounts(),
  }));
}
