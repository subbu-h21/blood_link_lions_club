import { savePushSubscriptionAction } from "@/lib/actions/push";

// Explicit ArrayBuffer (not the wider ArrayBufferLike Uint8Array's own
// constructor infers) - PushManager.subscribe's applicationServerKey
// wants BufferSource, which recent TS DOM lib versions type as
// ArrayBufferView<ArrayBuffer> specifically.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the service worker and subscribes to push. Originally called
 * only from the donor-registration moment (PRD.md §10.1: "Service worker
 * registered on donor registration") - never from a page-load effect,
 * and never from PhoneOtpFlow itself, since that component is shared
 * with the searcher's request-raising flow (S4), which must not trigger
 * a push subscription. **A second real caller as of 2026-08-07**:
 * `AdminPushToggle.tsx`'s own manual "Enable notifications" button click
 * in the admin portal header - this function was already role-agnostic
 * (nothing about it or `savePushSubscriptionAction` assumes "donor"), so
 * reusing it there needed zero changes here. Both callers share the same
 * real constraint this comment already establishes: only ever from a
 * genuine user action (a click, or the donor-registration flow's own
 * explicit opt-in step), never automatically from a page-load effect.
 * Fails soft - a browser without push support, or a user who denies
 * permission, doesn't block the rest of registration (or, for the admin
 * button, just leaves the button visible to retry).
 */
export async function registerForPushNotifications(): Promise<{ subscribed: boolean }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { subscribed: false };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { subscribed: false };

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { subscribed: false };
    }

    await savePushSubscriptionAction({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });

    return { subscribed: true };
  } catch {
    return { subscribed: false };
  }
}
