import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/verify";

/**
 * Shared body for every /api/cron/* route: auth check, then run the job
 * and turn a thrown error into a logged, non-200 response instead of
 * letting it reach the framework's own generic handler silently. Every
 * job here already retries safely on the next cron tick (each write is
 * individually guarded, e.g. `.is("admin_notified_at", null)`), so this
 * wrapper only needs to make a failure visible, not add new retry logic.
 * `jobName` is included in the log line so a failure is attributable to
 * one of the eight routes without opening each one's own logs by hand.
 */
export async function runCronJob(
  request: Request,
  jobName: string,
  run: () => Promise<Record<string, number>>,
): Promise<NextResponse> {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await run();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error(`[cron:${jobName}] failed`, error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
