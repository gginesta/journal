import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn()
}));

import { DELETE, POST } from "../src/app/api/push/subscriptions/route";
import { createSupabaseServerClient } from "../src/lib/supabase/server";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "33333333-3333-4333-8333-333333333333";
const endpoint = "https://push.example.com/send/abc123";

type TableResult = { data?: unknown; error?: { message: string } | null };

// Awaitable stub builder in the style of journal-sync-route.test.ts: every
// query method chains, and awaiting the builder resolves to the next queued
// result for its table (or an empty success).
function createFakeSupabase(options: { user?: { id: string } | null; member?: boolean; results?: Record<string, TableResult[]> }) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const queues = new Map(Object.entries(options.results ?? {}));

  function nextResult(table: string): TableResult {
    const queue = queues.get(table);
    if (queue && queue.length > 0) return queue.shift() as TableResult;
    if (table === "workspace_members") {
      return { data: options.member === false ? null : { role: "viewer" }, error: null };
    }
    return { data: [], error: null };
  }

  function builderFor(table: string) {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "upsert", "insert", "delete", "maybeSingle"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }
    (builder as { then: unknown }).then = (resolve: (value: TableResult) => void) => resolve(nextResult(table));
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

function makeBody(overrides: Record<string, unknown> = {}) {
  return {
    workspaceId,
    endpoint,
    keys: { p256dh: "BPtestp256dhkey", auth: "testauthsecret" },
    userAgent: "TestBrowser/1.0",
    ...overrides
  };
}

function subscriptionRequest(method: "POST" | "DELETE", body: unknown) {
  return new Request("http://localhost/api/push/subscriptions", {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

describe("POST /api/push/subscriptions", () => {
  it("returns 401 when there is no authenticated user", async () => {
    useFake(createFakeSupabase({ user: null }));
    const response = await POST(subscriptionRequest("POST", makeBody()));
    expect(response.status).toBe(401);
  });

  it("returns 400 for a body that is not valid JSON", async () => {
    useFake(createFakeSupabase({}));
    const response = await POST(subscriptionRequest("POST", "definitely not json"));
    expect(response.status).toBe(400);
  });

  it("returns 400 for an invalid workspace id", async () => {
    useFake(createFakeSupabase({}));
    const response = await POST(subscriptionRequest("POST", makeBody({ workspaceId: "not-a-uuid" })));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a non-https endpoint", async () => {
    useFake(createFakeSupabase({}));
    const response = await POST(subscriptionRequest("POST", makeBody({ endpoint: "http://insecure.example.com/x" })));
    expect(response.status).toBe(400);
  });

  it("returns 400 when subscription keys are missing", async () => {
    useFake(createFakeSupabase({}));
    const response = await POST(subscriptionRequest("POST", makeBody({ keys: { p256dh: "only-one" } })));
    expect(response.status).toBe(400);
  });

  it("returns 403 when the caller is not a workspace member", async () => {
    useFake(createFakeSupabase({ member: false }));
    const response = await POST(subscriptionRequest("POST", makeBody()));
    expect(response.status).toBe(403);
  });

  it("upserts the caller's subscription keyed on the endpoint", async () => {
    const fake = useFake(createFakeSupabase({}));
    const response = await POST(subscriptionRequest("POST", makeBody()));
    expect(response.status).toBe(200);
    const upsert = fake.calls.find((call) => call.table === "push_subscriptions" && call.method === "upsert");
    expect(upsert).toBeDefined();
    expect(upsert?.args[0]).toMatchObject({
      user_id: userId,
      workspace_id: workspaceId,
      endpoint,
      keys_p256dh: "BPtestp256dhkey",
      keys_auth: "testauthsecret",
      user_agent: "TestBrowser/1.0"
    });
    expect(upsert?.args[1]).toEqual({ onConflict: "endpoint" });
  });

  it("surfaces a database error instead of a false success", async () => {
    useFake(
      createFakeSupabase({
        results: { push_subscriptions: [{ data: null, error: { message: "subscription write failed" } }] }
      })
    );
    const response = await POST(subscriptionRequest("POST", makeBody()));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("subscription write failed");
  });
});

describe("DELETE /api/push/subscriptions", () => {
  it("returns 401 when there is no authenticated user", async () => {
    useFake(createFakeSupabase({ user: null }));
    const response = await DELETE(subscriptionRequest("DELETE", { endpoint }));
    expect(response.status).toBe(401);
  });

  it("returns 400 when the endpoint is missing", async () => {
    useFake(createFakeSupabase({}));
    const response = await DELETE(subscriptionRequest("DELETE", {}));
    expect(response.status).toBe(400);
  });

  it("deletes only the caller's row for the endpoint", async () => {
    const fake = useFake(createFakeSupabase({}));
    const response = await DELETE(subscriptionRequest("DELETE", { endpoint }));
    expect(response.status).toBe(200);
    const deleteCall = fake.calls.find((call) => call.table === "push_subscriptions" && call.method === "delete");
    expect(deleteCall).toBeDefined();
    const eqCalls = fake.calls.filter((call) => call.table === "push_subscriptions" && call.method === "eq");
    expect(eqCalls.map((call) => call.args)).toEqual([
      ["user_id", userId],
      ["endpoint", endpoint]
    ]);
  });
});
