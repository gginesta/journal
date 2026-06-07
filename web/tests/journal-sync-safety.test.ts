import { describe, expect, it } from "vitest";
import { canMutateWorkspaceRole, computePersonTagDeletions, isSafeWorkspaceStoragePath, parseImageDataUrl } from "../src/lib/journal-sync-safety";

describe("journal sync safety helpers", () => {
  it("allows only owner and editor roles to mutate a workspace", () => {
    expect(canMutateWorkspaceRole("owner")).toBe(true);
    expect(canMutateWorkspaceRole("editor")).toBe(true);
    expect(canMutateWorkspaceRole("viewer")).toBe(false);
    expect(canMutateWorkspaceRole(null)).toBe(false);
  });

  it("accepts storage paths only inside the current workspace prefix", () => {
    expect(isSafeWorkspaceStoragePath("workspace-1/2026-05-23/photo.jpg", "workspace-1")).toBe(true);
    expect(isSafeWorkspaceStoragePath("workspace-2/2026-05-23/photo.jpg", "workspace-1")).toBe(false);
    expect(isSafeWorkspaceStoragePath("/workspace-1/photo.jpg", "workspace-1")).toBe(false);
    expect(isSafeWorkspaceStoragePath("workspace-1/../workspace-2/photo.jpg", "workspace-1")).toBe(false);
  });

  it("parses only supported image data URLs", () => {
    expect(parseImageDataUrl("data:image/jpeg;base64,aGVsbG8=")?.extension).toBe("jpg");
    expect(parseImageDataUrl("data:image/png;base64,aGVsbG8=")?.extension).toBe("png");
    expect(parseImageDataUrl("data:text/html;base64,aGVsbG8=")).toBeNull();
    expect(parseImageDataUrl("https://example.test/photo.jpg")).toBeNull();
  });
});

describe("computePersonTagDeletions", () => {
  it("deletes only ids missing from the payload", () => {
    const result = computePersonTagDeletions(["a", "b", "c"], ["a", "c"], []);
    expect(result).toEqual(["b"]);
  });

  it("never deletes ids still present in the payload", () => {
    expect(computePersonTagDeletions(["a", "b"], ["a", "b"], [])).toEqual([]);
  });

  it("never deletes referenced tags even when absent from the payload", () => {
    const result = computePersonTagDeletions(["a", "b", "c"], ["a"], ["b"]);
    expect(result).toEqual(["c"]);
  });

  it("returns nothing when every existing tag is kept or referenced", () => {
    expect(computePersonTagDeletions(["a", "b"], ["a"], ["b"])).toEqual([]);
  });

  it("ignores duplicate existing ids", () => {
    expect(computePersonTagDeletions(["a", "a", "b"], [], [])).toEqual(["a", "b"]);
  });
});
