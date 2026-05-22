"use client";

import { createBrowserClient } from "@supabase/ssr";
import { hasSupabaseBrowserEnv } from "@/lib/supabase/public-env";

export function createSupabaseBrowserClient() {
  if (!hasSupabaseBrowserEnv()) return null;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
