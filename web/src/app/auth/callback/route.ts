import { NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/auth-redirect";
import { appUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const baseUrl = appUrl();
  const next = safeRedirectPath(requestUrl.searchParams.get("next"), baseUrl);

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase?.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, baseUrl));
}
