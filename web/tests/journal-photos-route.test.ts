import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn()
}));
vi.mock("@/lib/photo-thumbnails", () => ({
  makePhotoThumbnail: vi.fn()
}));

import { POST } from "../src/app/api/journal/photos/route";
import { syncLimits } from "../src/lib/journal-sync-validation";
import { makePhotoThumbnail } from "../src/lib/photo-thumbnails";
import { createSupabaseServerClient } from "../src/lib/supabase/server";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const entryId = "44444444-4444-4444-8444-444444444444";
const photoId = "55555555-5555-4555-8555-555555555555";
const userId = "33333333-3333-4333-8333-333333333333";

type TableResult = { data?: unknown; error?: { message: string } | null };

// Awaitable stub builder mirroring journal-sync-route.test.ts: query methods
// chain, awaiting the builder resolves the next queued result for its table.
// Storage uploads and signed-URL requests are recorded for assertions.
function createFakeSupabase(options: { user?: { id: string } | null; role?: string | null; results?: Record<string, TableResult[]> }) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const uploads: Array<{ bucket: string; path: string; contentType?: string }> = [];
  const queues = new Map(Object.entries(options.results ?? {}));

  function nextResult(table: string): TableResult {
    const queue = queues.get(table);
    if (queue && queue.length > 0) return queue.shift() as TableResult;
    if (table === "workspace_members") {
      return { data: options.role ? { role: options.role } : null, error: null };
    }
    if (table === "journal_entries") {
      return { data: { id: entryId, local_date: "2026-06-12" }, error: null };
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
    uploads,
    client: {
      auth: {
        getUser: async () => ({ data: { user: options.user === undefined ? { id: userId } : options.user } })
      },
      from: (table: string) => builderFor(table),
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, _body: unknown, opts?: { contentType?: string }) => {
            uploads.push({ bucket, path, contentType: opts?.contentType });
            const result = nextResult(`storage:${bucket}`);
            return { error: result.error ?? null };
          },
          createSignedUrl: async (path: string) => {
            const queued = queues.get(`signed:${bucket}`)?.shift();
            if (queued) return queued;
            return { data: { signedUrl: `https://signed.example/${bucket}/${path}` }, error: null };
          }
        })
      }
    }
  };
}

function makeFile(bytes: number = 4, type = "image/jpeg") {
  return new Blob([new Uint8Array(bytes)], { type });
}

function makeForm(overrides: Record<string, string> = {}, file: Blob | null = makeFile()) {
  const form = new FormData();
  const fields: Record<string, string> = {
    workspaceId,
    entryId,
    photoId,
    localDate: "2026-06-12",
    caption: "A small caption",
    sortOrder: "1",
    ...overrides
  };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  if (file) form.set("file", file, "photo.jpg");
  return form;
}

function photoRequest(body: FormData | string) {
  if (typeof body === "string") {
    return new Request("http://localhost/api/journal/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });
  }
  return new Request("http://localhost/api/journal/photos", { method: "POST", body });
}

const mockedCreateClient = vi.mocked(createSupabaseServerClient);
const mockedThumbnail = vi.mocked(makePhotoThumbnail);

beforeEach(() => {
  mockedCreateClient.mockReset();
  mockedThumbnail.mockReset();
  mockedThumbnail.mockResolvedValue({
    buffer: Buffer.from("thumb-bytes"),
    contentType: "image/jpeg",
    extension: "jpg"
  });
});

function useFake(fake: ReturnType<typeof createFakeSupabase>) {
  mockedCreateClient.mockResolvedValue(fake.client as never);
  return fake;
}

describe("POST /api/journal/photos", () => {
  it("returns 401 when there is no authenticated user", async () => {
    useFake(createFakeSupabase({ user: null }));
    const response = await POST(photoRequest(makeForm()));
    expect(response.status).toBe(401);
  });

  it("returns 400 for a body that is not multipart form data", async () => {
    useFake(createFakeSupabase({ role: "owner" }));
    const response = await POST(photoRequest(JSON.stringify({ workspaceId })));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/multipart form data/);
  });

  it("returns 400 for invalid ids, dates, and metadata", async () => {
    useFake(createFakeSupabase({ role: "owner" }));
    expect((await POST(photoRequest(makeForm({ workspaceId: "not-a-uuid" })))).status).toBe(400);
    expect((await POST(photoRequest(makeForm({ entryId: "not-a-uuid" })))).status).toBe(400);
    expect((await POST(photoRequest(makeForm({ photoId: "nope" })))).status).toBe(400);
    expect((await POST(photoRequest(makeForm({ localDate: "June 12" })))).status).toBe(400);
    expect((await POST(photoRequest(makeForm({ caption: "a".repeat(syncLimits.caption + 1) })))).status).toBe(400);
    expect((await POST(photoRequest(makeForm({ sortOrder: "not-a-number" })))).status).toBe(400);
    expect((await POST(photoRequest(makeForm({}, null)))).status).toBe(400);
  });

  it("returns 415 for a file that is not a supported image type", async () => {
    useFake(createFakeSupabase({ role: "owner" }));
    const response = await POST(photoRequest(makeForm({}, makeFile(4, "text/plain"))));
    expect(response.status).toBe(415);
  });

  it("returns 413 for a file over the size cap", async () => {
    useFake(createFakeSupabase({ role: "owner" }));
    const response = await POST(photoRequest(makeForm({}, makeFile(syncLimits.photoUploadBytes + 1))));
    expect(response.status).toBe(413);
  });

  it("returns 403 when the member is a viewer", async () => {
    useFake(createFakeSupabase({ role: "viewer" }));
    const response = await POST(photoRequest(makeForm()));
    expect(response.status).toBe(403);
  });

  it("returns 403 when the user is not a member of the workspace", async () => {
    useFake(createFakeSupabase({ role: null }));
    const response = await POST(photoRequest(makeForm()));
    expect(response.status).toBe(403);
  });

  it("returns 404 when the entry row has not synced yet", async () => {
    useFake(
      createFakeSupabase({
        role: "editor",
        results: { journal_entries: [{ data: null, error: null }] }
      })
    );
    const response = await POST(photoRequest(makeForm()));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/has not synced yet/);
  });

  it("returns 415 when the bytes cannot be read as an image", async () => {
    useFake(createFakeSupabase({ role: "editor" }));
    mockedThumbnail.mockRejectedValue(new Error("unsupported image"));
    const response = await POST(photoRequest(makeForm()));
    expect(response.status).toBe(415);
  });

  it("stores the photo and thumbnail, upserts the row, and returns fresh signed URLs", async () => {
    const fake = useFake(createFakeSupabase({ role: "editor" }));
    const response = await POST(photoRequest(makeForm()));
    expect(response.status).toBe(200);
    const body = await response.json();

    const storagePath = `${workspaceId}/2026-06-12/${photoId}.jpg`;
    const thumbnailPath = `${workspaceId}/2026-06-12/${photoId}-thumb.jpg`;
    expect(body).toEqual({
      storagePath,
      thumbnailPath,
      previewUrl: `https://signed.example/journal-photos/${storagePath}`,
      thumbnailUrl: `https://signed.example/journal-thumbnails/${thumbnailPath}`
    });

    expect(fake.uploads).toEqual([
      { bucket: "journal-photos", path: storagePath, contentType: "image/jpeg" },
      { bucket: "journal-thumbnails", path: thumbnailPath, contentType: "image/jpeg" }
    ]);

    const upsert = fake.calls.find((call) => call.table === "photo_attachments" && call.method === "upsert");
    expect(upsert?.args[0]).toEqual({
      id: photoId,
      entry_id: entryId,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      caption: "A small caption",
      sort_order: 1,
      byte_size: 4
    });
    expect(upsert?.args[1]).toEqual({ onConflict: "id" });
  });

  it("uses the server entry's local date for the storage path", async () => {
    const fake = useFake(
      createFakeSupabase({
        role: "editor",
        results: { journal_entries: [{ data: { id: entryId, local_date: "2026-06-11" }, error: null }] }
      })
    );
    const response = await POST(photoRequest(makeForm({ localDate: "2026-06-12" })));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.storagePath).toBe(`${workspaceId}/2026-06-11/${photoId}.jpg`);
    expect(fake.uploads[0]?.path).toBe(`${workspaceId}/2026-06-11/${photoId}.jpg`);
  });

  it("surfaces a database error from the metadata upsert instead of a false success", async () => {
    useFake(
      createFakeSupabase({
        role: "editor",
        results: { photo_attachments: [{ data: null, error: { message: "photo row write failed" } }] }
      })
    );
    const response = await POST(photoRequest(makeForm()));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("photo row write failed");
  });
});
