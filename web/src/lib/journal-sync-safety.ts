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

export function canMutateWorkspaceRole(role: WorkspaceRole | null | undefined) {
  return Boolean(role && syncMutationRoles.has(role));
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
