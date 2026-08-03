import { createDbClient } from "@/lib/db/client";

export type NotificationChannel = "web_push" | "whatsapp" | "sms";
export type NotificationRecipientRole = "donor" | "admin" | "coordinator";

/**
 * One row per sendPush attempt (PRD.md §4.6) - written regardless of
 * whether delivery succeeded, so `delivered_at` being null is itself the
 * "it failed" signal, not a missing row. `requestId`/`shortageId` are
 * mutually-exclusive-in-practice context (which event triggered this),
 * both nullable per PRD's own schema.
 *
 * `recipientId`/`recipientRole` (Unit 44, widened from the original
 * donor-only `donor_id`) - this is now the one shared notification log
 * for every recipient type (donor push invites, Unit 18; admin/
 * coordinator escalation pushes, Unit 44), not a second parallel
 * mechanism that could drift out of sync with this one - confirmed with
 * the project owner before widening rather than building a separate
 * admin-only notification path. `recipientId` is a `profiles.id` for
 * every role (donors via `donors.id = profiles.id`, Unit 02's 1:1
 * pattern); `recipientRole` is denormalised here rather than re-derived
 * via a join to `profiles` on every read, since Unit 55's metrics need to
 * separate donor response rates from admin response times cheaply.
 */
export async function recordNotification(params: {
  recipientId: string;
  recipientRole: NotificationRecipientRole;
  requestId?: string | null;
  shortageId?: string | null;
  channel: NotificationChannel;
  delivered: boolean;
}): Promise<void> {
  const db = createDbClient();
  const { error } = await db.from("notifications").insert({
    recipient_id: params.recipientId,
    recipient_role: params.recipientRole,
    request_id: params.requestId ?? null,
    shortage_id: params.shortageId ?? null,
    channel: params.channel,
    delivered_at: params.delivered ? new Date().toISOString() : null,
  });
  if (error) throw error;
}
