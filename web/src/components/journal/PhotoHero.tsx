/* eslint-disable @next/next/no-img-element -- Journal photos can be local data URLs or private signed storage URLs. */

import { useMemo, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import type { JournalEntry, PhotoAttachment } from "@/types/journal";
import { fileToCompressedDataUrl, normalizePhotoOrder } from "@/components/journal/helpers";

export function PhotoHero({
  entry,
  canEdit,
  onChangePhotos,
  showGuidance = true
}: {
  entry: JournalEntry;
  canEdit: boolean;
  onChangePhotos: (updater: (photos: PhotoAttachment[]) => PhotoAttachment[]) => void;
  // First-photo guidance retires once the workspace has kept any photo.
  showGuidance?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replacePhotoId, setReplacePhotoId] = useState<string | null>(null);
  const orderedPhotos = useMemo(() => normalizePhotoOrder(entry.photos), [entry.photos]);
  const heroPhoto = orderedPhotos[0];
  const remainingSlots = Math.max(0, 2 - orderedPhotos.length);
  const hasPhotos = orderedPhotos.length > 0;

  async function handleFiles(files: FileList | null) {
    if (!canEdit) return;
    if (!files) return;
    setError(null);
    const selected = Array.from(files).slice(0, remainingSlots);
    if (selected.length === 0) {
      setStatus("Two photos is the beta limit for a calm daily entry.");
      return;
    }
    if (files.length > selected.length) {
      setStatus("Kept the first photos only. One or two is plenty for the day.");
    } else {
      setStatus("Preparing photo...");
    }

    try {
      const newPhotos: PhotoAttachment[] = [];
      for (const file of selected) {
        const previewUrl = await fileToCompressedDataUrl(file);
        newPhotos.push({
          id: crypto.randomUUID(),
          entryId: entry.id,
          storagePath: "",
          thumbnailPath: "",
          previewUrl,
          caption: "",
          sortOrder: orderedPhotos.length + newPhotos.length,
          createdAt: new Date().toISOString()
        });
      }
      onChangePhotos((current) => [...current, ...newPhotos]);
      setStatus(newPhotos.length === 1 ? "Photo saved. Future-you gets a little more context." : "Photos saved. Pick the cover that feels most like today.");
    } catch {
      setError("That photo could not be added. Try a smaller image or a different file.");
      setStatus(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleReplaceFile(files: FileList | null) {
    if (!canEdit) return;
    const file = files?.[0];
    const targetId = replacePhotoId;
    if (!file || !targetId) return;
    setError(null);
    setStatus("Replacing photo...");

    try {
      const previewUrl = await fileToCompressedDataUrl(file);
      onChangePhotos((current) =>
        current.map((photo) =>
          photo.id === targetId
            ? {
                ...photo,
                previewUrl,
                thumbnailUrl: undefined,
                storagePath: "",
                thumbnailPath: "",
                createdAt: new Date().toISOString()
              }
            : photo
        )
      );
      setStatus("Photo replaced. Caption and order stayed with the memory.");
    } catch {
      setError("That replacement could not be added. Try a smaller image or a different file.");
      setStatus(null);
    } finally {
      setReplacePhotoId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  }

  function updateCaption(photoId: string, caption: string) {
    if (!canEdit) return;
    onChangePhotos((current) => current.map((photo) => (photo.id === photoId ? { ...photo, caption } : photo)));
  }

  function movePhoto(photoId: string, direction: -1 | 1) {
    if (!canEdit) return;
    onChangePhotos((current) => {
      const next = normalizePhotoOrder(current);
      const index = next.findIndex((photo) => photo.id === photoId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= next.length) return current;
      const [photo] = next.splice(index, 1);
      next.splice(targetIndex, 0, photo);
      return next;
    });
    setStatus(direction < 0 ? "Cover photo updated." : "Photo order updated.");
  }

  function removePhoto(photoId: string) {
    if (!canEdit) return;
    onChangePhotos((current) => current.filter((photo) => photo.id !== photoId));
    setStatus("Photo removed. The entry is still yours to shape.");
  }

  function beginReplace(photoId: string) {
    if (!canEdit) return;
    setReplacePhotoId(photoId);
    window.setTimeout(() => replaceInputRef.current?.click(), 0);
  }

  return (
    <section className="overflow-hidden rounded-[24px] bg-ink shadow-photo sm:rounded-[28px]">
      <button
        type="button"
        onClick={() => {
          if (canEdit) inputRef.current?.click();
        }}
        disabled={!canEdit}
        className="relative flex min-h-[260px] w-full items-end overflow-hidden p-4 text-left text-white sm:min-h-[470px] sm:p-6"
      >
        {heroPhoto ? (
          <img
            src={heroPhoto.previewUrl}
            alt={heroPhoto.caption || "Today's journal photo"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#8da38e,#e6c392_52%,#b96464)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.58))]" />
        <div className="relative max-w-md pr-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">{hasPhotos ? "Photo of the day" : "Memory starts here"}</p>
          <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
            {hasPhotos ? heroPhoto.caption.trim() || "Let the photo hold most of the story." : "Start with one photo, if one moment stands out."}
          </h2>
          <p className="mt-2 text-sm text-white/86">
            {orderedPhotos.length < 2 ? "One or two photos is plenty. Text is optional." : "Two photos saved. Reorder or remove if today feels simpler."}
          </p>
        </div>
      </button>

      <div className="grid gap-4 bg-journal-surface p-4">
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="image/*"
          multiple
          aria-label="Add journal photos"
          disabled={!canEdit}
          onChange={(event) => handleFiles(event.target.files)}
        />
        <input
          ref={replaceInputRef}
          className="hidden"
          type="file"
          accept="image/*"
          aria-label="Replace selected journal photo"
          disabled={!canEdit}
          onChange={(event) => handleReplaceFile(event.target.files)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!canEdit || remainingSlots === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-rose px-4 text-sm font-bold text-white"
          >
            <ImagePlus aria-hidden="true" size={18} />
            {orderedPhotos.length === 0 ? "Add photo" : remainingSlots > 0 ? "Add one more" : "Two photos saved"}
          </button>
          <div className="min-w-[180px] flex-1 text-sm text-warm-gray" aria-live="polite">
            {error ? <p className="font-semibold text-rose">{error}</p> : <p>{status ?? `${remainingSlots} photo slot${remainingSlots === 1 ? "" : "s"} open.`}</p>}
          </div>
        </div>

        {orderedPhotos.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {orderedPhotos.map((photo, index) => (
              <article key={photo.id} className="grid gap-3 rounded-[22px] border border-journal-line bg-white p-3 shadow-sm">
                <div className="grid grid-cols-[76px_1fr] gap-3">
                  <img src={photo.thumbnailUrl || photo.previewUrl} alt="" className="h-[76px] w-[76px] rounded-2xl object-cover" />
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-warm-gray">
                    {index === 0 ? "Cover caption" : "Second photo caption"}
                    <input
                      value={photo.caption}
                      maxLength={300}
                      onChange={(event) => updateCaption(photo.id, event.target.value)}
                      placeholder={index === 0 ? "What should this photo remember?" : "Add a small note"}
                      disabled={!canEdit}
                      className="min-h-10 min-w-0 rounded-2xl border border-journal-line bg-journal-raised px-3 text-sm font-semibold normal-case tracking-normal text-soft-ink outline-none focus:ring-4 focus:ring-rose/15"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => movePhoto(photo.id, -1)}
                    disabled={!canEdit || index === 0}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-journal-raised px-3 text-xs font-bold text-soft-ink"
                    aria-label="Move photo earlier"
                  >
                    <ChevronLeft aria-hidden="true" size={14} />
                    Earlier
                  </button>
                  <button
                    type="button"
                    onClick={() => movePhoto(photo.id, 1)}
                    disabled={!canEdit || index === orderedPhotos.length - 1}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-journal-raised px-3 text-xs font-bold text-soft-ink"
                    aria-label="Move photo later"
                  >
                    Later
                    <ChevronRight aria-hidden="true" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => beginReplace(photo.id)}
                    disabled={!canEdit}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-rose/10 px-3 text-xs font-bold text-rose"
                    aria-label="Replace photo"
                  >
                    <Camera aria-hidden="true" size={14} />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    disabled={!canEdit}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-journal-raised px-3 text-xs font-bold text-warm-gray"
                    aria-label="Remove photo"
                  >
                    <X aria-hidden="true" size={14} />
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : showGuidance ? (
          <div className="grid gap-2 rounded-[22px] border border-dashed border-rose/25 bg-white/72 p-4 text-sm text-warm-gray sm:grid-cols-3">
            <p><span className="font-bold text-soft-ink">Pick one moment.</span> A meal, a face, the sky, the ordinary proof.</p>
            <p><span className="font-bold text-soft-ink">Add a caption later.</span> The photo can be the whole entry.</p>
            <p><span className="font-bold text-soft-ink">Keep it light.</span> Two photos max keeps the ritual calm.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
