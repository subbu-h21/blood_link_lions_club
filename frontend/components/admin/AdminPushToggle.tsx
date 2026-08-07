"use client";

import { useEffect, useState } from "react";
import { registerForPushNotifications } from "@/lib/push/subscribe";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

type Status = "checking" | "unsupported" | "off" | "on" | "pending" | "error";

/**
 * Admin/coordinator push opt-in (2026-08-07, user-requested - a small
 * header button, manual click, confirmed via `AskUserQuestion` over an
 * auto-prompt or a dedicated settings page). Reuses
 * `registerForPushNotifications()`/`savePushSubscriptionAction()`
 * (Unit 18/19) entirely unchanged - both were already role-agnostic
 * (session-derived `profileId`, no role check anywhere in either), so
 * this is a pure new UI entry point onto existing, already-shipped
 * infrastructure, not a second push mechanism.
 *
 * Checks *this browser's own* real subscription state on mount
 * (`registration.pushManager.getSubscription()`), not a DB row count -
 * a DB count would say "yes" the moment any device has ever subscribed,
 * even if the device looking at the button right now never has; asking
 * the browser's own Push API is what actually determines "should this
 * button be visible on this screen." Fails soft throughout, same
 * philosophy as `registerForPushNotifications` itself - no permission
 * API, no service worker, or a denied prompt all just mean the button
 * quietly doesn't do anything useful, never a thrown error surfaced to
 * the admin.
 */
export function AdminPushToggle() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkExistingSubscription() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration("/sw.js");
        const existing = await registration?.pushManager.getSubscription();
        if (!cancelled) setStatus(existing ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("off");
      }
    }

    checkExistingSubscription();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setStatus("pending");
    const { subscribed } = await registerForPushNotifications();
    setStatus(subscribed ? "on" : "error");
  }

  if (status === "checking" || status === "unsupported" || status === "on") {
    return null;
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={status === "pending"}
      className="rounded-full border border-ink-200 px-3.5 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {status === "error" ? t("adminPortal.pushToggle.errorLabel") : t("adminPortal.pushToggle.enableButton")}
    </button>
  );
}
