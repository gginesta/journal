import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JournalEntry } from "../src/types/journal";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn()
}));
vi.mock("@/lib/photo-thumbnails", () => ({
  makePhotoThumbnail: vi.fn()
}));

import { POST } from "../src/app/api/journal/sync/route";
import { makePhotoThumbnail } from "../src/lib/photo-thumbnails";
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

  it("sends only the caller's own and legacy sessions to the RPC", async () => {
    const fake = useFake(createFakeSupabase({ role: "editor" }));
    const ownSession = {
      id: "66666666-6666-4666-8666-666666666666",
      kind: "evening" as const,
      createdBy: userId,
      responses: []
    };
    const legacySession = {
      id: "77777777-7777-4777-8777-777777777777",
      kind: "morning" as const,
      createdBy: null,
      responses: []
    };
    const partnerSession = {
      id: "88888888-8888-4888-8888-888888888888",
      kind: "anytime" as const,
      createdBy: "99999999-9999-4999-8999-999999999999",
      responses: []
    };
    await POST(syncRequest(makePayload({ entries: [makeEntry({ sessions: [ownSession, legacySession, partnerSession] })] })));
    const rpcCall = fake.calls.find((call) => call.table === "rpc:sync_journal_entry");
    const args = rpcCall?.args[0] as { entry: { sessions: Array<{ id: string }> } };
    expect(args.entry.sessions.map((session) => session.id)).toEqual([ownSession.id, legacySession.id]);
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

  it("skips section upserts and person-tag reconciliation when the sections are omitted", async () => {
    const fake = useFake(createFakeSupabase({ role: "editor" }));
    const response = await POST(syncRequest({ workspaceId, entries: [makeEntry()] }));
    expect(response.status).toBe(200);
    expect(fake.calls.some((call) => call.table === "person_tags")).toBe(false);
    expect(fake.calls.some((call) => call.table === "prompt_templates")).toBe(false);
    expect(fake.calls.some((call) => call.table === "reminder_preferences")).toBe(false);
    expect(fake.calls.some((call) => call.table === "rpc:sync_journal_entry")).toBe(true);
  });

  it("still reconciles person-tag deletions when a people section is present", async () => {
    const fake = useFake(createFakeSupabase({ role: "editor" }));
    const response = await POST(syncRequest(makePayload({ people: [] })));
    expect(response.status).toBe(200);
    expect(fake.calls.some((call) => call.table === "person_tags" && call.method === "select")).toBe(true);
  });

  it("maps applied and stale outcomes to the right entries when syncing several at once", async () => {
    useFake(
      createFakeSupabase({
        role: "editor",
        results: {
          "rpc:sync_journal_entry": [
            { data: { status: "applied", server_updated_at: "2026-06-12T20:00:01.000Z" }, error: null },
            { data: { status: "stale", server_updated_at: "2026-06-12T21:00:00.000Z" }, error: null },
            { data: { status: "applied", server_updated_at: "2026-06-12T20:00:03.000Z" }, error: null }
          ]
        }
      })
    );
    const entryIds = [
      "44444444-4444-4444-8444-444444444444",
      "55555555-5555-4555-8555-555555555555",
      "66666666-6666-4666-8666-666666666666"
    ];
    const response = await POST(syncRequest(makePayload({ entries: entryIds.map((id) => makeEntry({ id })) })));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.stale).toEqual([entryIds[1]]);
    expect(body.applied).toEqual({
      [entryIds[0]]: "2026-06-12T20:00:01.000Z",
      [entryIds[2]]: "2026-06-12T20:00:03.000Z"
    });
  });

  it("filters out entries that belong to a different workspace", async () => {
    const fake = useFake(createFakeSupabase({ role: "editor" }));
    const response = await POST(syncRequest(makePayload({ entries: [makeEntry({ workspaceId: otherWorkspaceId })] })));
    expect(response.status).toBe(200);
    expect(fake.calls.some((call) => call.table === "rpc:sync_journal_entry")).toBe(false);
  });

  // New clients upload photo bytes out-of-band through /api/journal/photos,
  // but a tab loaded before that shipped may still send base64 in the payload.
  it("still stores legacy base64 photos that arrive in the sync payload", async () => {
    vi.mocked(makePhotoThumbnail).mockResolvedValue({
      buffer: Buffer.from("thumb-bytes"),
      contentType: "image/jpeg",
      extension: "jpg"
    });
    const fake = useFake(createFakeSupabase({ role: "editor" }));
    const photo = {
      id: "55555555-5555-4555-8555-555555555555",
      entryId: "44444444-4444-4444-8444-444444444444",
      storagePath: "",
      thumbnailPath: "",
      previewUrl: "data:image/jpeg;base64,abcd",
      caption: "Legacy upload",
      sortOrder: 0,
      createdAt: "2026-06-12T20:00:00.000Z"
    };
    const response = await POST(syncRequest(makePayload({ entries: [makeEntry({ photos: [photo] })] })));
    expect(response.status).toBe(200);
    const rpcCall = fake.calls.find((call) => call.table === "rpc:sync_journal_entry");
    const args = rpcCall?.args[0] as { entry: { photos: Array<{ storage_path: string; thumbnail_path: string }> } };
    expect(args.entry.photos[0].storage_path).toBe(`${workspaceId}/2026-06-12/${photo.id}.jpg`);
    expect(args.entry.photos[0].thumbnail_path).toBe(`${workspaceId}/2026-06-12/${photo.id}-thumb.jpg`);
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
