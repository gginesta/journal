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

export function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(String(reader.result));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
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
