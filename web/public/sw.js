// Service worker for reminder notifications. Kept tiny on purpose: no caching,
// no offline logic — it only shows pushes and focuses the app on click.

const FALLBACK_TITLE = "Photo Gratitude Journal";
const FALLBACK_BODY = "Time to keep today — one photo or one line is enough.";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = null;
  try {
    payload = event.data ? event.data.json() : null;
  } catch {
    payload = null;
  }
  const title = (payload && payload.title) || FALLBACK_TITLE;
  const options = {
    body: (payload && payload.body) || FALLBACK_BODY,
    icon: (payload && payload.icon) || "/icon.svg",
    // A stable tag collapses repeated reminders into one notification.
    tag: "pgj-reminder"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.includes("/app") && "focus" in client) return client.focus();
      }
      return self.clients.openWindow("/app");
    })
  );
});
