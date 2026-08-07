import { createDbClient } from "@/lib/db/client";

// Any one profile's own subscription count is small in practice (a
// handful of devices) - true for a donor and equally true for the
// admin/coordinator subscribers `AdminPushToggle.tsx` added 2026-08-07,
// this table was always keyed by generic `profile_id`, never donor-only -
// but capped explicitly anyway (CLAUDE.md rule 4) rather than left
// open-ended, same reasoning as every other list read in this project.
const MAX_SUBSCRIPTIONS_PER_PROFILE = 20;

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Keyed by profile_id, not donor_id - see the migration's own comment.
 * Upserts by endpoint so a browser re-subscribing (e.g. after clearing
 * site data) updates its keys rather than creating a duplicate row.
 */
export async function savePushSubscription(
  profileId: string,
  subscription: PushSubscriptionRecord,
): Promise<void> {
  const db = createDbClient();
  const { error } = await db.from("push_subscriptions").upsert(
    {
      profile_id: profileId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function getPushSubscriptionsForProfile(profileId: string): Promise<PushSubscriptionRecord[]> {
  const db = createDbClient();
  const { data, error } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("profile_id", profileId)
    .limit(MAX_SUBSCRIPTIONS_PER_PROFILE);
  if (error) throw error;
  return data;
}

/** Called when a push service reports the subscription is gone (HTTP 410). */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  const db = createDbClient();
  const { error } = await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}
