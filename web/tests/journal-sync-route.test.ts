import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JournalEntry } from "../src/types/journal";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn()
}));
vi.mock("@/lib/photo-thumbnails", () => ({
  makePhotoThumbnail: vi.fn()
}));

import { POST } from "../src/app/api/journal/sync/route";
import { createSupabaseServerClient } from "../src/lib/supabase/server";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const otherWorkspaceId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";

type TableResult = { data?: unknown; error?: { message: string } | null };

// Awaitable stub builder: every query method chains, and awaiting the builder
// resolves to the next queued result for its table (or an empty success).
// RPC results queue under "rpc:<functionName>".
function createFakeSupabase(options: { user?: { id: string } | null; role?: string | null; results?: Record<string, TableResult[]> }) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const queues = new Map(Object.entries(options.results ?? {}));

  function nextResult(table: string): TableResult {
    const queue = queues.get(table);
    if (queue && queue.length > 0) return queue.shift() as TableResult;
    if (table === "workspace_members") {
      return { data: options.role ? { role: options.role } : null, error: null };
    }
    if (table.startsWith("rpc:")) {
      return { data: { status: "applied", server_updated_at: "2026-06-12T20:00:01.000Z" }, error: null };
    }
    return { data: [], error: null };
  }

  function builderFor(table: string) {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "order", "limit", "upsert", "insert", "delete", "maybeSingle"]) {
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
      from: (table: string) => builderFor(table),
      rpc: async (fn: string, args: unknown) => {
        calls.push({ table: `rpc:${fn}`, method: "rpc", args: [args] });
        return nextResult(`rpc:${fn}`);
      },
      storage: {
        from: () => ({
          upload: async () => ({ error: null })
        })
      }
    }
  };
}

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    workspaceId,
    localDate: "2026-06-12",
    mood: "good",
    note: "A small good day.",
    sessions: [],
    photos: [],
    personTagIds: [],
    details: [],
    createdAt: "2026-06-12T20:00:00.000Z",
    updatedAt: "2026-06-12T20:00:00.000Z",
    ...overrides
  };
}

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    workspaceId,
    people: [],
    prompts: [],
    reminders: { cadence: "evening", remindersEnabled: true, eveningTime: "20:30", morningTime: "08:00" },
    entries: [makeEntry()],
    ...overrides
  };
}

function syncRequest(body: unknown) {
  return new Request("http://localhost/api/journal/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

const mockedCreateClient = vi.mocked(createSupabaseServerClient);

beforeEach(() => {
  mockedCreateClient.mockReset();
});

function useFake(fake: ReturnType<typeof createFakeSupabase>) {
  mockedCreateClient.mockResolvedValue(fake.client as never);
  return fake;
}

describe("POST /api/journal/sync", () => {
  it("returns 401 when there is no authenticated user", async () => {
    useFake(createFakeSupabase({ user: null }));
    const response = await POST(syncRequest(makePayload()));
    expect(response.status).toBe(401);
  });

  it("returns 400 for a body that is not valid JSON", async () => {
    useFake(createFakeSupabase({ role: "owner" }));
    const response = await POST(syncRequest("definitely not json"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/valid JSON/);
  });

  it("returns 400 for a payload that fails validation", async () => {
    useFake(createFakeSupabase({ role: "owner" }));
    const response = await POST(syncRequest(makePayload({ workspaceId: "not-a-uuid" })));
    expect(response.status).toBe(400);
  });

  it("returns 403 when the member is a viewer", async () => {
    useFake(createFakeSupabase({ role: "viewer" }));
    const response = await POST(syncRequest(makePayload()));
    expect(response.status).toBe(403);
  });

  it("returns 403 when the user is not a member of the workspace", async () => {
    useFake(createFakeSupabase({ role: null }));
    const response = await POST(syncRequest(makePayload()));
    expect(response.status).toBe(403);
  });

  it("syncs a valid editor payload through the transactional RPC and acks the server timestamp", async () => {
    const fake = useFake(createFakeSupabase({ role: "editor" }));
    const response = await POST(syncRequest(makePayload()));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.stale).toEqual([]);
    expect(body.applied["44444444-4444-4444-8444-444444444444"]).toBe("2026-06-12T20:00:01.000Z");
    expect(fake.calls.some((call) => call.table === "rpc:sync_journal_entry")).toBe(true);
  });

  it("passes the client baseline to the RPC for the stale-write guard", async () => {
    const fake = useFake(createFakeSupabase({ role: "editor" }));
    await POST(syncRequest(makePayload({ entries: [makeEntry({ syncedAt: "2026-06-11T09:00:00.000Z" })] })));
    const rpcCall = fake.calls.find((call) => call.table === "rpc:sync_journal_entry");
    expect(rpcCall).toBeDefined();
    const args = rpcCall?.args[0] as { entry: { base_updated_at: string | null } };
    expect(args.entry.base_updated_at).toBe("2026-06-11T09:00:00.000Z");
  });

  it("reports entries the server refused as stale instead of overwriting", async () => {
    useFake(
      createFakeSupabase({
        role: "editor",
        results: {
          "rpc:sync_journal_entry": [{ data: { status: "stale", server_updated_at: "2026-06-12T21:00:00.000Z" }, error: null }]
        }
      })
    );
    const response = await POST(syncRequest(makePayload()));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.stale).toEqual(["44444444-4444-4444-8444-444444444444"]);
    expect(body.applied).toEqual({});
  });

  it("filters out entries that belong to a different workspace", async () => {
    const fake = useFake(createFakeSupabase({ role: "editor" }));
    const response = await POST(syncRequest(makePayload({ entries: [makeEntry({ workspaceId: otherWorkspaceId })] })));
    expect(response.status).toBe(200);
    expect(fake.calls.some((call) => call.table === "rpc:sync_journal_entry")).toBe(false);
  });

  it("rejects photo storage paths that do not belong to the workspace", async () => {
    useFake(createFakeSupabase({ role: "editor" }));
    const photo = {
      id: "55555555-5555-4555-8555-555555555555",
      entryId: "44444444-4444-4444-8444-444444444444",
      storagePath: `${otherWorkspaceId}/2026-06-12/photo.jpg`,
      thumbnailPath: `${otherWorkspaceId}/2026-06-12/photo-thumb.jpg`,
      previewUrl: "",
      caption: "",
      sortOrder: 0,
      createdAt: "2026-06-12T20:00:00.000Z"
    };
    const response = await POST(syncRequest(makePayload({ entries: [makeEntry({ photos: [photo] })] })));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toMatch(/does not belong to this workspace/);
  });

  it("surfaces a database error instead of reporting a false success", async () => {
    useFake(
      createFakeSupabase({
        role: "editor",
        results: {
          "rpc:sync_journal_entry": [{ data: null, error: { message: "entry rewrite failed" } }]
        }
      })
    );
    const response = await POST(syncRequest(makePayload()));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("entry rewrite failed");
  });
});
