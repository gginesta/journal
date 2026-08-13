// Browser-side Web Push helpers for reminders. Every path is
// failure-tolerant: demo mode, e2e, and unsupported browsers resolve to a
// status instead of throwing, and nothing here runs unless the user turns
// reminders on.

export type PushDeviceStatus = "subscribed" | "not-subscribed" | "blocked" | "unsupported";

export type PushSubscribeOutcome = {
  status: PushDeviceStatus;
  error?: string;
};

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

export async function getPushDeviceStatus(): Promise<PushDeviceStatus> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    return subscription ? "subscribed" : "not-subscribed";
  } catch {
    return "not-subscribed";
  }
}

export async function subscribeThisDevice(workspaceId: string): Promise<PushSubscribeOutcome> {
  if (!isPushSupported()) return { status: "unsupported" };
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { status: "unsupported", error: "Push is not configured for this deployment." };

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { status: "blocked" };

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      }));

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      throw new Error("This browser returned an incomplete push subscription.");
    }

    const response = await fetch("/api/push/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent
      })
    });
    if (!response.ok) throw new Error("Saving the reminder subscription failed.");
    return { status: "subscribed" };
  } catch (error) {
    return {
      status: "not-subscribed",
      error: error instanceof Error ? error.message : "Could not enable notifications on this device."
    };
  }
}

export async function unsubscribeThisDevice(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await fetch("/api/push/subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    }).catch(() => undefined);
    await subscription.unsubscribe();
  } catch {
    // Unsubscribing is best-effort; the dispatcher also prunes dead endpoints.
  }
}
