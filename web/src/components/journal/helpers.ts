import { Heart, Leaf, Moon, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { JournalBootstrap, Mood, PhotoAttachment } from "@/types/journal";
import { memoryDetailCategoryLabels, type MemoryDetailCategory } from "@/lib/memory-details";

export type AppTab = "today" | "memories" | "calendar" | "insights" | "settings";

export type SaveState = "saved" | "saving" | "offline" | "error" | "local" | "readonly";

export type DetailCategory = MemoryDetailCategory;

export const moodOptions: Array<{ id: Mood; title: string; icon: LucideIcon }> = [
  { id: "low", title: "Low", icon: Moon },
  { id: "quiet", title: "Quiet", icon: Leaf },
  { id: "good", title: "Good", icon: Heart },
  { id: "bright", title: "Bright", icon: Sparkles },
  { id: "glowing", title: "Glowing", icon: Sparkles }
];

export const detailCategories: Array<{ id: DetailCategory; title: string }> = ([
  "note",
  "phrase",
  "favorite",
  "routine",
  "milestone",
  "quote"
] as DetailCategory[]).map((id) => ({ id, title: memoryDetailCategoryLabels[id] }));

export function shortDisplayName(profile: JournalBootstrap["profile"]) {
  const displayName = profile?.displayName?.trim();
  if (!displayName || displayName.includes("@")) return "there";
  return displayName.split(/\s+/)[0] || "there";
}

export function normalizePhotoOrder(photos: PhotoAttachment[]): PhotoAttachment[] {
  return [...photos]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt))
    .map((photo, index) => ({ ...photo, sortOrder: index }));
}

const COMPRESS_MAX_SIDE = 1600;
const COMPRESS_QUALITY = 0.82;

export async function fileToCompressedDataUrl(file: File): Promise<string> {
  // Preferred path: decode and scale off the main thread so a large camera
  // photo never freezes the ritual. Falls back to the canvas pipeline (and
  // ultimately the original file) on older browsers or decode failures.
  if (typeof createImageBitmap === "function" && typeof OffscreenCanvas === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, COMPRESS_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: COMPRESS_QUALITY });
        return await blobToDataUrl(blob);
      }
      bitmap.close();
    } catch {
      // Fall through to the main-thread pipeline below.
    }
  }
  return mainThreadCompressedDataUrl(file);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function mainThreadCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, COMPRESS_MAX_SIDE / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(String(reader.result));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", COMPRESS_QUALITY));
      };
      image.onerror = () => resolve(String(reader.result));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function responseErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}
