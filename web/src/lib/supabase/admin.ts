import { createClient } from "@supabase/supabase-js";

// Service-role client for server-only jobs (the reminder dispatcher) that must
// read across workspaces. Never import this from client components, and never
// use it for request-scoped user actions — those go through the RLS-bound
// server client.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
