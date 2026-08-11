"use client";

import { CloudOff } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Shown when an authenticated user's bootstrap came back without a workspace
// (which should not happen — every account gets one at signup). An explicit
// dead-end beats silently showing demo fixtures.
export function WorkspaceRecovery({ email }: { email: string }) {
  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase?.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-journal border border-journal-line bg-journal-surface p-8 text-center shadow-journal">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose/10 text-rose">
          <CloudOff aria-hidden="true" size={24} />
        </span>
        <h1 className="mt-5 text-xl font-bold text-ink">We couldn&apos;t load your journal workspace</h1>
        <p className="mt-3 text-sm leading-6 text-soft-ink">
          You&apos;re signed in{email ? ` as ${email}` : ""}, but no journal workspace came back. This is usually
          temporary — trying again often fixes it. Your memories are safe.
        </p>
        <div className="mt-6 grid gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-rose px-5 text-sm font-bold text-white"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-soft-ink"
          >
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}
