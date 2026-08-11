import type { WorkspaceRole } from "@/types/journal";

export const syncMutationRoles = new Set<WorkspaceRole>(["owner", "editor"]);

export type ImageDataUrlParts = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  base64: string;
  extension: "jpg" | "png" | "webp";
};

const imageExtensions: Record<ImageDataUrlParts["contentType"], ImageDataUrlParts["extension"]> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

// Storage extension for an uploaded image content type; null for anything that
// is not a supported journal photo format.
export function imageExtensionForContentType(contentType: string): ImageDataUrlParts["extension"] | null {
  return imageExtensions[contentType as ImageDataUrlParts["contentType"]] ?? null;
}

export function canMutateWorkspaceRole(role: WorkspaceRole | null | undefined) {
  return Boolean(role && syncMutationRoles.has(role));
}

/**
 * Decide which existing person-tag ids should be deleted during a sync.
 *
 * A tag is removed only when it is absent from the synced payload AND is not
 * referenced by any entry or little detail. The reference guard is a product
 * safeguard: it ensures we never lose a tag the user attached to a memory, even
 * though the join tables would cascade.
 */
export function computePersonTagDeletions(
  existingIds: Iterable<string>,
  payloadIds: Iterable<string>,
  referencedIds: Iterable<string>
): string[] {
  const keep = new Set(payloadIds);
  const referenced = new Set(referencedIds);
  const deletions: string[] = [];
  const seen = new Set<string>();
  for (const id of existingIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (keep.has(id) || referenced.has(id)) continue;
    deletions.push(id);
  }
  return deletions;
}

export function isSafeWorkspaceStoragePath(path: string, workspaceId: string) {
  if (!path || !workspaceId) return false;
  if (path.startsWith("/") || path.includes("\\") || path.includes("..")) return false;
  if (!path.startsWith(`${workspaceId}/`)) return false;
  return path.split("/").every((segment) => segment.length > 0);
}

export function parseImageDataUrl(value: string): ImageDataUrlParts | null {
  const match = value.match(/^data:([^;]+);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) return null;

  const contentType = match[1] as ImageDataUrlParts["contentType"];
  const extension = imageExtensions[contentType];
  if (!extension) return null;

  const base64 = match[2] ?? "";
  if (!base64) return null;

  return {
    contentType,
    extension,
    base64
  };
}
