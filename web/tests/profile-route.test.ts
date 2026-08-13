import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn()
}));

import { POST } from "../src/app/api/profile/route";
import { createSupabaseServerClient } from "../src/lib/supabase/server";

const userId = "33333333-3333-4333-8333-333333333333";

type TableResult = { data?: unknown; error?: { message: string } | null };

// Awaitable stub builder in the style of push-subscriptions-route.test.ts:
// every query method chains, awaiting resolves to the queued result.
function createFakeSupabase(options: { user?: { id: string } | null; updateError?: { message: string } | null }) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];

  function builderFor(table: string) {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "update", "single", "maybeSingle"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }
    (builder as { then: unknown }).then = (resolve: (value: TableResult) => void) =>
      resolve({ data: null, error: options.updateError ?? null });
    return builder;
  }

  return {
    calls,
    client: {
      auth: {
        getUser: async () => ({ data: { user: options.user === undefined ? { id: userId } : options.user } })
      },
      from: (table: string) => builderFor(table)
    }
  };
}

const mockedCreateClient = vi.mocked(createSupabaseServerClient);

beforeEach(() => {
  mockedCreateClient.mockReset();
});

function useFake(fake: ReturnType<typeof createFakeSupabase>) {
  mockedCreateClient.mockResolvedValue(fake.client as never);
  return fake;
}

function profileRequest(body: unknown) {
  return new Request("http://localhost/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

describe("POST /api/profile", () => {
  it("returns 503 when Supabase is not configured", async () => {
    mockedCreateClient.mockResolvedValue(null);
    const response = await POST(profileRequest({ experienceMode: "simple" }));
    expect(response.status).toBe(503);
  });

  it("returns 401 when there is no authenticated user", async () => {
    useFake(createFakeSupabase({ user: null }));
    const response = await POST(profileRequest({ experienceMode: "simple" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 for a body that is not valid JSON", async () => {
    useFake(createFakeSupabase({}));
    const response = await POST(profileRequest("definitely not json"));
    expect(response.status).toBe(400);
  });

  it("returns 400 for an unknown experience mode", async () => {
    useFake(createFakeSupabase({}));
    for (const experienceMode of ["Simple", "everything", "", null, 3]) {
      const response = await POST(profileRequest({ experienceMode }));
      expect(response.status).toBe(400);
    }
  });

  it("updates only the caller's own profile row", async () => {
    const fake = useFake(createFakeSupabase({}));
    const response = await POST(profileRequest({ experienceMode: "full" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const update = fake.calls.find((call) => call.table === "profiles" && call.method === "update");
    expect(update?.args[0]).toEqual({ experience_mode: "full" });
    const idFilter = fake.calls.find((call) => call.table === "profiles" && call.method === "eq");
    expect(idFilter?.args).toEqual(["id", userId]);
  });

  it("returns 500 when the update fails", async () => {
    useFake(createFakeSupabase({ updateError: { message: "boom" } }));
    const response = await POST(profileRequest({ experienceMode: "simple" }));
    expect(response.status).toBe(500);
  });
});
