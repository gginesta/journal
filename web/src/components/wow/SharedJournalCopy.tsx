import { Users } from "lucide-react";
import type { PersonTag, Workspace } from "@/types/journal";
import { sharedJournalCopy } from "@/lib/shared-journal-copy";

export function SharedJournalCopy({ workspace, people }: { workspace: Workspace | null; people: PersonTag[] }) {
  const copy = sharedJournalCopy(workspace, people);

  return (
    <div className="rounded-[22px] border border-journal-line bg-journal-raised p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-rose">
          <Users aria-hidden="true" size={17} />
        </span>
        <div>
          <p className="text-sm font-bold text-soft-ink">{copy.title}</p>
          <p className="mt-1 text-sm leading-6 text-warm-gray">{copy.body}</p>
        </div>
      </div>
    </div>
  );
}
