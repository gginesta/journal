/* eslint-disable @next/next/no-img-element -- Journal photos can be local data URLs or private signed storage URLs. */

// The keepsake photo hero (Warm Album redesign): one emotional anchor card
// with shadow-photo. New photos "develop" — the low-res thumb shows instantly
// (never a bare spinner), a leaf hairline creeps along the slot's bottom edge,
// and the image settles from 8px blur / 96% scale when ready. 0, 1, and 2
// photos are all steady states.

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import clsx from "clsx";
import type { JournalEntry, PhotoAttachment } from "@/types/journal";
import { fileToCompressedDataUrl, normalizePhotoOrder } from "@/components/journal/helpers";

type DevelopingPhoto = {
  objectUrl: string;
  file: File;
  failed: boolean;
};

export function PhotoHero({
  entry,
  canEdit,
  onChangePhotos
}: {
  entry: JournalEntry;
  canEdit: boolean;
  onChangePhotos: (updater: (photos: PhotoAttachment[]) => PhotoAttachment[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [replacePhotoId, setReplacePhotoId] = useState<string | null>(null);
  const [developing, setDeveloping] = useState<DevelopingPhoto | null>(null);
  const [justDevelopedId, setJustDevelopedId] = useState<string | null>(null);
  const [coverSlidesLeft, setCoverSlidesLeft] = useState(false);
  const previousCount = useRef(entry.photos.length);
  const orderedPhotos = useMemo(() => normalizePhotoOrder(entry.photos), [entry.photos]);
  const heroPhoto = orderedPhotos[0];
  const secondPhoto = orderedPhotos[1];
  const remainingSlots = Math.max(0, 2 - orderedPhotos.length);

  // Second photo arriving slides the first left (350ms) into the cover slot.
  useEffect(() => {
    if (previousCount.current === 1 && orderedPhotos.length === 2) {
      setCoverSlidesLeft(true);
      const timer = window.setTimeout(() => setCoverSlidesLeft(false), 400);
      previousCount.current = orderedPhotos.length;
      return () => window.clearTimeout(timer);
    }
    previousCount.current = orderedPhotos.length;
  }, [orderedPhotos.length]);

  useEffect(() => {
    if (!justDevelopedId) return;
    const timer = window.setTimeout(() => setJustDevelopedId(null), 600);
    return () => window.clearTimeout(timer);
  }, [justDevelopedId]);

  async function developFile(file: File, existingObjectUrl?: string) {
    const objectUrl = existingObjectUrl ?? URL.createObjectURL(file);
    setDeveloping({ objectUrl, file, failed: false });
    try {
      const previewUrl = await fileToCompressedDataUrl(file);
      const photo: PhotoAttachment = {
        id: crypto.randomUUID(),
        entryId: entry.id,
        storagePath: "",
        thumbnailPath: "",
        previewUrl,
        caption: "",
        sortOrder: 2,
        createdAt: new Date().toISOString()
      };
      onChangePhotos((current) => normalizePhotoOrder([...current, photo]).slice(0, 2));
      URL.revokeObjectURL(objectUrl);
      setDeveloping(null);
      setJustDevelopedId(photo.id);
      setStatus("Photo saved. Future-you gets a little more context.");
      return true;
    } catch {
      setDeveloping({ objectUrl, file, failed: true });
      setStatus(null);
      return false;
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!canEdit || !files) return;
    const selected = Array.from(files).slice(0, remainingSlots);
    if (selected.length === 0) {
      setStatus("Two photos is the beta limit for a calm daily entry.");
      return;
    }
    if (files.length > selected.length) {
      setStatus("Kept the first photos only. One or two is plenty for the day.");
    }
    if (inputRef.current) inputRef.current.value = "";
    for (const file of selected) {
      const ok = await developFile(file);
      if (!ok) break;
    }
  }

  function retryDevelop() {
    if (!developing) return;
    void developFile(developing.file, developing.objectUrl);
  }

  function dismissFailedDevelop() {
    if (developing) URL.revokeObjectURL(developing.objectUrl);
    setDeveloping(null);
    setStatus(null);
  }

  async function handleReplaceFile(files: FileList | null) {
    if (!canEdit) return;
    const file = files?.[0];
    const targetId = replacePhotoId;
    if (!file || !targetId) return;
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
      setJustDevelopedId(targetId);
      setStatus("Photo replaced. Caption and order stayed with the memory.");
    } catch {
      setStatus("That replacement could not be added. Try a smaller image or a different file.");
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

  const hiddenInputs = (
    <>
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
    </>
  );

  const statusLine = (
    <p className={clsx("text-[13px] leading-5 text-warm-gray", status ? null : "sr-only")} aria-live="polite">
      {status ?? ""}
    </p>
  );

  // Empty steady state (day one, or after removing): the dashed invitation.
  if (orderedPhotos.length === 0 && !developing) {
    return (
      <section aria-label="Today's photo">
        {hiddenInputs}
        <button
          type="button"
          onClick={() => {
            if (canEdit) inputRef.current?.click();
          }}
          disabled={!canEdit}
          className="flex min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-journal border-[1.5px] border-dashed border-rose/35 bg-journal-surface/70 p-6 text-center transition hover:bg-journal-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-rose/10 text-rose">
            <Camera aria-hidden="true" size={26} />
          </span>
          <span className="text-[15px] font-bold text-soft-ink">Add a photo from today</span>
          <span className="max-w-60 text-[13px] leading-6 text-warm-gray">
            Any photo counts &mdash; a meal, a sky, a mess. Or skip it: one line is enough.
          </span>
        </button>
        <div className="mt-2 px-1">{statusLine}</div>
      </section>
    );
  }

  const developingSlot = developing ? (
    <div className="relative h-full min-h-24 overflow-hidden rounded-card bg-journal-raised">
      <img
        src={developing.objectUrl}
        alt="Photo still developing"
        className="block h-full w-full scale-[0.96] object-cover opacity-60 blur-[8px]"
      />
      {!developing.failed ? (
        <span aria-hidden="true" className="wa-hairline absolute inset-x-0 bottom-0 h-0.5 bg-leaf" />
      ) : null}
    </div>
  ) : null;

  return (
    <section aria-label="Today's photo" className="rounded-journal border border-journal-line bg-journal-surface p-3 pb-3.5 shadow-photo">
      {hiddenInputs}

      {!heroPhoto && developing ? (
        <div className="h-[240px] sm:h-[290px]">{developingSlot}</div>
      ) : secondPhoto || (heroPhoto && developing) ? (
        <div className="grid grid-cols-[1.5fr_1fr] gap-2">
          {heroPhoto ? (
            <img
              key={heroPhoto.id}
              src={heroPhoto.previewUrl}
              alt={heroPhoto.caption || "Today's journal photo"}
              className={clsx(
                "block h-[220px] w-full rounded-card object-cover sm:h-[280px]",
                coverSlidesLeft ? "wa-slide-left" : null,
                justDevelopedId === heroPhoto.id ? "wa-develop" : null
              )}
            />
          ) : null}
          <div className="grid grid-rows-2 gap-2">
            {secondPhoto ? (
              <img
                key={secondPhoto.id}
                src={secondPhoto.previewUrl}
                alt={secondPhoto.caption || "Second journal photo"}
                className={clsx("block h-full min-h-24 w-full rounded-card object-cover", justDevelopedId === secondPhoto.id ? "wa-develop" : null)}
              />
            ) : developing ? (
              developingSlot
            ) : null}
            <div className="grid place-items-center rounded-card border-[1.5px] border-dashed border-journal-line bg-journal-raised/90 text-xs font-semibold text-warm-gray">
              {orderedPhotos.length === 2 ? "2 of 2" : "1 of 2"}
            </div>
          </div>
        </div>
      ) : heroPhoto ? (
        <img
          key={heroPhoto.id}
          src={heroPhoto.previewUrl}
          alt={heroPhoto.caption || "Today's journal photo"}
          className={clsx(
            "block h-[240px] w-full rounded-card object-cover sm:h-[290px]",
            justDevelopedId === heroPhoto.id ? "wa-develop" : null
          )}
        />
      ) : null}

      {developing?.failed ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-card bg-journal-raised p-3">
          <p className="min-w-40 flex-1 text-sm font-semibold text-soft-ink">Didn&rsquo;t make it &mdash; try again</p>
          <button
            type="button"
            onClick={retryDevelop}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-rose px-4 text-sm font-bold text-white transition hover:bg-rose-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={dismissFailedDevelop}
            className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-bold text-warm-gray focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
          >
            Not now
          </button>
        </div>
      ) : null}

      {heroPhoto ? (
        <div className="mt-3 flex items-center gap-2.5">
          <input
            value={heroPhoto.caption}
            maxLength={300}
            onChange={(event) => updateCaption(heroPhoto.id, event.target.value)}
            placeholder="What should this photo remember?"
            aria-label="Cover caption"
            disabled={!canEdit}
            className="min-h-11 min-w-0 flex-1 rounded-control border-0 bg-transparent px-1 text-sm text-soft-ink outline-none placeholder:text-warm-gray focus-visible:ring-4 focus-visible:ring-rose/15"
          />
          {canEdit && remainingSlots > 0 && !developing ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label="Add a second photo"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-dashed border-rose/40 bg-rose/5 text-rose transition hover:bg-rose/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
            >
              <Plus aria-hidden="true" size={18} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1 px-1">{statusLine}</div>

      {canEdit && orderedPhotos.length > 0 ? (
        <details className="mt-2 rounded-card bg-journal-raised/60 px-3 py-2">
          <summary className="cursor-pointer text-[13px] font-bold text-warm-gray">Adjust photos</summary>
          <div className="mt-3 grid gap-3">
            {orderedPhotos.map((photo, index) => (
              <article key={photo.id} className="grid gap-3 rounded-card border border-journal-line bg-white p-3">
                <div className="grid grid-cols-[56px_1fr] items-center gap-3">
                  <img src={photo.thumbnailUrl || photo.previewUrl} alt="" className="h-14 w-14 rounded-control object-cover" />
                  <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-warm-gray">
                    {index === 0 ? "Cover caption" : "Second photo caption"}
                    <input
                      value={photo.caption}
                      maxLength={300}
                      onChange={(event) => updateCaption(photo.id, event.target.value)}
                      placeholder={index === 0 ? "What should this photo remember?" : "Add a small note"}
                      disabled={!canEdit}
                      className="min-h-10 min-w-0 rounded-control border border-journal-line bg-journal-raised px-3 text-sm font-semibold normal-case tracking-normal text-soft-ink outline-none focus:ring-4 focus:ring-rose/15"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => movePhoto(photo.id, -1)}
                    disabled={!canEdit || index === 0}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-journal-raised px-3 text-xs font-bold text-soft-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
                    aria-label="Move photo earlier"
                  >
                    <ChevronLeft aria-hidden="true" size={14} />
                    Earlier
                  </button>
                  <button
                    type="button"
                    onClick={() => movePhoto(photo.id, 1)}
                    disabled={!canEdit || index === orderedPhotos.length - 1}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-journal-raised px-3 text-xs font-bold text-soft-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
                    aria-label="Move photo later"
                  >
                    Later
                    <ChevronRight aria-hidden="true" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => beginReplace(photo.id)}
                    disabled={!canEdit}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-rose/10 px-3 text-xs font-bold text-rose focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
                    aria-label="Replace photo"
                  >
                    <Camera aria-hidden="true" size={14} />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    disabled={!canEdit}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-journal-raised px-3 text-xs font-bold text-warm-gray focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
                    aria-label="Remove photo"
                  >
                    <X aria-hidden="true" size={14} />
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
