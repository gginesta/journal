import { afterEach, describe, expect, it, vi } from "vitest";
import { hasSupabaseEnv, isDemoMode } from "../src/lib/supabase/env";

function stubSupabaseEnv(present: boolean) {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", present ? "https://example.supabase.co" : "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", present ? "anon-key" : "");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isDemoMode", () => {
  it("is on only when the flag is exactly 'true' with Supabase configured", () => {
    stubSupabaseEnv(true);
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    expect(isDemoMode()).toBe(true);
  });

  it("is off with Supabase configured and the flag unset or 'false'", () => {
    stubSupabaseEnv(true);
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    expect(isDemoMode()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    expect(isDemoMode()).toBe(false);
  });

  it("never fails open on a typo'd flag value", () => {
    stubSupabaseEnv(true);
    for (const typo of ["True", "TRUE", "ture", "1", "yes"]) {
      vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", typo);
      expect(isDemoMode()).toBe(false);
    }
  });

  it("stays on when Supabase is not configured, keeping env-less dev working", () => {
    stubSupabaseEnv(false);
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    expect(hasSupabaseEnv()).toBe(false);
    expect(isDemoMode()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    expect(isDemoMode()).toBe(true);
  });
});
