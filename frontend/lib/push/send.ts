import { getConfiguredWebPush } from "@/lib/push/vapid";
import { getPushSubscriptionsForProfile, deletePushSubscription } from "@/lib/db/push-subscriptions";
import { recordNotification, type NotificationRecipientRole } from "@/lib/db/notifications";

// `type` (2026-08-07) discriminates what `sw.js`'s push handler renders -
// omitted or `"invite"` keeps the exact original invite rendering
// ("{bloodGroup} blood needed", using `destinationBank`/`urgency`), a
// deliberately non-breaking addition for the one pre-existing call site
// (`createRequest`), which still passes every field it always did.
// `"stood_down"` (SPEC.md §4.1 row 12/§4.2 row 12/D1's own "stood_down
// and thanked"/"warm thank-you message - never silence" wording) only
// needs `bloodGroup`/`deepLink` - `destinationBank`/`urgency` are
// optional specifically so that caller doesn't need to fetch data it has
// no real use for.
export type PushPayload = {
  type?: "invite" | "stood_down";
  bloodGroup: string;
  destinationBank?: string;
  urgency?: string;
  deepLink: string;
};

/**
 * PRD.md §10.1 - sends a web push to every subscription the recipient
 * holds (fan-out across devices), then records exactly one
 * `notifications` row summarising the outcome - `delivered_at` set if at
 * least one subscription accepted the push, null otherwise (that's the
 * "outcome" PRD.md asks for; Web Push's own API only confirms the push
 * *service* accepted the message for delivery, not that the device
 * displayed it - confirmed against current web-push docs before
 * implementing). Subscriptions the push service reports as gone (HTTP
 * 410) are deleted.
 *
 * The one shared push-send path for every recipient type (donor invites,
 * Unit 18/22; admin/coordinator escalation notices, Unit 44) - not two
 * parallel mechanisms that could drift (retry/rate-limit logic living in
 * only one of them, say). `recipientId` is always a `profiles.id`
 * (donors via `donors.id = profiles.id`, Unit 02's 1:1 pattern);
 * `recipientRole` is passed explicitly by the caller (who already knows
 * it) rather than looked up here, both to avoid a redundant query and
 * because `notifications.recipient_role` is meant to reflect the role
 * the recipient held *at send time*, matching `recordNotification`'s own
 * reasoning. `push_subscriptions` is keyed by `profile_id` generically
 * (Unit 18's own migration comment), so `getPushSubscriptionsForProfile`
 * already worked for any role without changes - only the `notifications`
 * write needed widening (Unit 44), not the subscription lookup itself.
 *
 * Admin/coordinator accounts gained a real push-subscription registration
 * flow 2026-08-07 (`AdminPushToggle.tsx`, reusing `registerForPushNotifications`
 * unchanged) - before that, calling this for an admin always recorded a
 * `notifications` row with `delivered_at: null` (zero subscriptions could
 * ever exist), which is still the correct, honest outcome for any admin
 * who simply hasn't clicked "Enable notifications" yet, not a bug either
 * way.
 */
export async function sendPush(
  recipientId: string,
  recipientRole: NotificationRecipientRole,
  payload: PushPayload,
  context: { requestId?: string; shortageId?: string } = {},
): Promise<{ delivered: boolean }> {
  const webpush = getConfiguredWebPush();
  const subscriptions = await getPushSubscriptionsForProfile(recipientId);

  let delivered = false;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
      );
      delivered = true;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 410) {
        await deletePushSubscription(subscription.endpoint);
      }
      // Any other failure for this one subscription doesn't stop
      // delivery attempts to the recipient's other devices.
    }
  }

  await recordNotification({
    recipientId,
    recipientRole,
    requestId: context.requestId,
    shortageId: context.shortageId,
    channel: "web_push",
    delivered,
  });

  return { delivered };
}
