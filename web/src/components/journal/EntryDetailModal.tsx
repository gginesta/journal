import { tagChipStyle } from "@/lib/tag-colors";
import clsx from "clsx";
import { Sparkles, X } from "lucide-react";
import type { JournalEntry, PersonTag, PromptTemplate } from "@/types/journal";
import { formatDisplayDate } from "@/lib/dates";
import { entryPeople, isEntryComplete } from "@/lib/journal-logic";
import { JournalPhoto } from "@/components/journal/shared";
import { PromptPanel } from "@/components/journal/TodayView";

export function EntryDetailModal({
  entry,
  people,
  prompts,
  memberNames = {},
  currentUserId = null,
  canEdit = false,
  onUpdateEntry,
  onClose
}: {
  entry: JournalEntry;
  people: PersonTag[];
  // Editing wiring (all optional): with prompts + onUpdateEntry and edit
  // rights, reflections render as the same editable panel Today uses, so a
  // past day — including a calendar-started backfill shell — can be written
  // right here. Without them the modal stays the read-only memory view.
  prompts?: PromptTemplate[];
  memberNames?: Record<string, string>;
  currentUserId?: string | null;
  canEdit?: boolean;
  onUpdateEntry?: (entryId: string, updater: (entry: JournalEntry) => JournalEntry) => void;
  onClose: () => void;
}) {
  const tagged = entryPeople(entry, people);
  const editor = canEdit && onUpdateEntry && prompts ? { onUpdateEntry, prompts } : null;
  const sections = entry.sessions
    .map((session) => ({
      session,
      responses: session.responses.filter((response) => response.text.trim()),
      author: session.createdBy ? (memberNames[session.createdBy] ?? "A household member") : null
    }))
    .filter((section) => section.responses.length > 0);
  const hasMultipleAuthors = new Set(sections.map((section) => section.author)).size > 1;
  const responses = sections.flatMap((section) => section.responses);

  return (
    <div className="fixed inset-0 z-50 grid bg-ink/42 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Memory detail">
      <section className="journal-scrollbar relative mx-auto flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[30px] bg-journal-surface shadow-photo">
        <div className="flex items-start justify-between gap-4 border-b border-journal-line p-5 sm:p-6">
          <div>
            <p className="text-sm font-bold text-rose">{formatDisplayDate(entry.localDate)}</p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Memory from this day</h2>
            <p className="mt-1 text-sm text-warm-gray">Photos, nice things, people, and tiny details saved together.</p>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-journal-raised text-soft-ink" aria-label="Close memory">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="journal-scrollbar overflow-y-auto p-5 sm:p-6">
          {entry.photos.length > 0 ? (
            <div className={clsx("grid gap-3", entry.photos.length > 1 ? "md:grid-cols-2" : "")}>
              {entry.photos.map((photo) => (
                <figure key={photo.id} className="grid gap-2">
                  <JournalPhoto src={photo.previewUrl} alt={photo.caption || "Journal memory"} className="max-h-[520px] w-full rounded-[24px] object-cover shadow-sm" />
                  {photo.caption.trim() ? <figcaption className="px-1 text-sm font-semibold text-soft-ink">{photo.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center rounded-[24px] bg-[linear-gradient(135deg,#8da38e,#e6c392_52%,#b96464)] p-8 text-center text-white">
              <div>
                <Sparkles aria-hidden="true" className="mx-auto" size={28} />
                <p className="mt-3 text-lg font-bold">A text-only memory, still worth keeping.</p>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="grid gap-4">
              {editor ? (
                <PromptPanel
                  entry={entry}
                  prompts={editor.prompts}
                  canEdit
                  currentUserId={currentUserId}
                  memberNames={memberNames}
                  onUpdateEntry={editor.onUpdateEntry}
                  primaryFieldId={null}
                />
              ) : null}
              {!editor && responses.length > 0 ? (
                <section className="rounded-journal border border-journal-line bg-white p-5">
                  <h3 className="text-lg font-bold">Reflections</h3>
                  <div className="mt-4 grid gap-4">
                    {sections.map((section) => (
                      <div key={section.session.id} className="grid gap-3">
                        {hasMultipleAuthors ? (
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-warm-gray">
                            {section.author ?? "Shared reflections"}
                          </p>
                        ) : null}
                        {section.responses.map((response) => (
                          <article key={response.id} className="rounded-2xl bg-journal-raised p-4">
                            <p className="text-sm font-bold text-rose">{response.promptText}</p>
                            <p className="mt-2 whitespace-pre-line text-soft-ink">{response.text}</p>
                          </article>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {entry.details.length > 0 ? (
                <section className="rounded-journal border border-journal-line bg-white p-5">
                  <h3 className="text-lg font-bold">Little Details</h3>
                  <div className="mt-4 grid gap-3">
                    {entry.details.map((detail) => {
                      const detailPeople = people.filter((person) => detail.personTagIds.includes(person.id));
                      return (
                        <article key={detail.id} className="rounded-2xl bg-journal-raised p-4">
                          <p className="text-soft-ink">{detail.text}</p>
                          {detailPeople.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {detailPeople.map((person) => (
                                <span key={person.id} className="rounded-full px-2.5 py-1 text-xs font-bold" style={tagChipStyle(person.color)}>
                                  {person.name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="grid content-start gap-4">
              <section className="rounded-journal border border-journal-line bg-white p-5">
                <h3 className="font-bold">People</h3>
                {tagged.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tagged.map((person) => (
                      <span key={person.id} className="rounded-full px-3 py-1.5 text-sm font-bold" style={tagChipStyle(person.color)}>
                        {person.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-warm-gray">No people tagged.</p>
                )}
              </section>

              <section className="rounded-journal border border-journal-line bg-white p-5">
                <h3 className="font-bold">Saved because</h3>
                <p className="mt-2 text-sm text-warm-gray">
                  {isEntryComplete(entry)
                    ? "This day has at least one photo or reflection, so it counts toward the habit."
                    : "This entry is still open for a photo or a few words."}
                </p>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
