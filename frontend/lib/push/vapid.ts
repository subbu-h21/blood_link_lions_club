import webpush from "web-push";

let configured = false;

/**
 * Configures the web-push module's VAPID details exactly once per
 * server process (setVapidDetails mutates module-level state, not a
 * per-call option). PRD.md §10.1: "VAPID keys in server env."
 */
export function getConfiguredWebPush(): typeof webpush {
  if (!configured) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) {
      throw new Error(
        "VAPID env vars are not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT)",
      );
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return webpush;
}
