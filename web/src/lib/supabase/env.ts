export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isDemoMode(): boolean {
  // Demo requires an explicit opt-in ("true") or a missing Supabase config
  // (keeps env-less local dev working). Any other value runs the real app, so
  // a typo'd flag can never silently serve fixture data.
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !hasSupabaseEnv();
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
