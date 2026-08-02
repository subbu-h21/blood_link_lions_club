"use server";

import { createClient } from "@/lib/supabase/server";
import { savePushSubscription, type PushSubscriptionRecord } from "@/lib/db/push-subscriptions";

/**
 * Derives the profile id from the server-verified session (CLAUDE.md
 * rule 2 - never a client-supplied id), same trust boundary as
 * ensureProfileAfterVerification: only ever saves the calling session's
 * own subscription.
 */
export async function savePushSubscriptionAction(subscription: PushSubscriptionRecord): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    throw new Error("No verified session - call this only after phone verification");
  }
  const { sub: profileId } = data.claims as { sub: string };
  await savePushSubscription(profileId, subscription);
}
