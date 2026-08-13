import { NextResponse } from "next/server";
import { mapWithConcurrency } from "@/lib/concurrency";
import { dueReminder, type ReminderKind, type ReminderSchedulePrefs } from "@/lib/reminder-schedule";
import { sendWebPush, type VapidConfig } from "@/lib/web-push";
import { logApiFailure } from "@/lib/server-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Reminder dispatcher, called by Vercel Cron every 15 minutes (web/vercel.json).
// It finds workspaces whose reminder time falls in the current 15-minute
// window and sends a Web Push to every subscribed device in them. It runs with
// the service-role client because it must read preferences and subscriptions
// across all workspaces; it only ever reads reminder metadata, never journal
// content.

export const dynamic = "force-dynamic";

const reminderCopy: Record<ReminderKind, { title: string; body: string }> = {
  evening: { title: "Time to keep today", body: "One photo or one line is enough." },
  morning: { title: "A quiet moment for the day ahead", body: "What would you like to notice today?" }
};

type ReminderPrefRow = {
  workspace_id: string;
  cadence: ReminderSchedulePrefs["cadence"];
  evening_time: string | null;
  morning_time: string | null;
  timezone: string | null;
};

type SubscriptionRow = {
  id: string;
  workspace_id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
};

function fail(status: number, message: string) {
  logApiFailure("push/dispatch", status, message);
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return fail(503, "CRON_SECRET is not configured");
  }
  // Vercel Cron sends "Authorization: Bearer ${CRON_SECRET}" automatically.
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return fail(401, "Cron authorization required");
  }

  const vapid: VapidConfig | null =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
      ? {
          publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          privateKey: process.env.VAPID_PRIVATE_KEY,
          subject: process.env.VAPID_SUBJECT
        }
      : null;
  if (!vapid) {
    return fail(503, "VAPID keys are not configured");
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return fail(503, "Supabase service role is not configured");
  }

  const { data: prefRows, error: prefError } = await supabase
    .from("reminder_preferences")
    .select("workspace_id,cadence,evening_time,morning_time,timezone")
    .eq("reminders_enabled", true);
  if (prefError) {
    return fail(500, prefError.message);
  }

  const now = new Date();
  const dueWorkspaces = new Map<string, ReminderKind>();
  for (const row of (prefRows ?? []) as ReminderPrefRow[]) {
    const kind = dueReminder(
      {
        cadence: row.cadence,
        eveningTime: row.evening_time ?? "",
        morningTime: row.morning_time ?? "",
        timezone: row.timezone
      },
      now
    );
    if (kind) dueWorkspaces.set(row.workspace_id, kind);
  }

  if (dueWorkspaces.size === 0) {
    return NextResponse.json({ ok: true, due: 0, sent: 0, failed: 0, removed: 0 });
  }

  const { data: subRows, error: subError } = await supabase
    .from("push_subscriptions")
    .select("id,workspace_id,endpoint,keys_p256dh,keys_auth")
    .in("workspace_id", Array.from(dueWorkspaces.keys()));
  if (subError) {
    return fail(500, subError.message);
  }

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];
  // Bounded fan-out: sequential sends grow linearly with subscriber count and
  // can run a cron invocation into the platform's function timeout, silently
  // dropping the tail of the reminder batch.
  const dueSubscriptions = ((subRows ?? []) as SubscriptionRow[]).filter((subscription) => dueWorkspaces.has(subscription.workspace_id));
  await mapWithConcurrency(dueSubscriptions, 6, async (subscription) => {
    const kind = dueWorkspaces.get(subscription.workspace_id);
    if (!kind) return;
    try {
      const result = await sendWebPush(
        { endpoint: subscription.endpoint, p256dh: subscription.keys_p256dh, auth: subscription.keys_auth },
        JSON.stringify(reminderCopy[kind]),
        vapid
      );
      if (result.expired) {
        expiredIds.push(subscription.id);
      } else if (result.ok) {
        sent += 1;
      } else {
        failed += 1;
        logApiFailure("push/dispatch", result.status, "Push service rejected a reminder");
      }
    } catch (error) {
      failed += 1;
      logApiFailure("push/dispatch", 500, error instanceof Error ? error.message : "Push send failed");
    }
  });

  // 404/410 endpoints are gone for good (revoked permission, reinstalled
  // browser); drop them so future runs stay lean.
  if (expiredIds.length > 0) {
    const { error: deleteError } = await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    if (deleteError) logApiFailure("push/dispatch", 500, deleteError.message);
  }

  return NextResponse.json({ ok: true, due: dueWorkspaces.size, sent, failed, removed: expiredIds.length });
}
