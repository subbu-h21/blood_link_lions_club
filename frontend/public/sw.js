// Unit 18: minimal service worker for Web Push (PRD.md §10.1). Handles
// push delivery and notification-click deep-linking only - no offline
// caching or install strategy. That's a separate PWA-installability
// concern no prompt unit currently owns (see prompts/README.md); this
// unit is push infrastructure specifically, not full PWA scaffolding.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  // "stood_down" (2026-08-07, SPEC.md's own "stood_down with a warm
  // thank-you message - never silence" wording) is a second, distinct
  // notification shape - the original invite rendering below is
  // completely untouched for `type` omitted/"invite", the one
  // pre-existing real call site (createRequest's own invite push).
  let title;
  let body;
  if (payload.type === "stood_down") {
    title = `${payload.bloodGroup} request update`;
    body = "This request no longer needs you - thank you for being ready to help.";
  } else {
    title = `${payload.bloodGroup} blood needed`;
    body = payload.urgency === "emergency" ? `Emergency — ${payload.destinationBank}` : payload.destinationBank;
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { deepLink: payload.deepLink },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const deepLink = event.notification.data && event.notification.data.deepLink ? event.notification.data.deepLink : "/";
  event.waitUntil(clients.openWindow(deepLink));
});
