import { Sparkles } from "lucide-react";
import type { PersonTag, Workspace } from "@/types/journal";
import { inferMemoryFocus, littleDetailsNudgeCopy } from "@/lib/shared-journal-copy";

export function LittleDetailsNudge({ workspace, people }: { workspace: Workspace | null; people: PersonTag[] }) {
  const copy = littleDetailsNudgeCopy(inferMemoryFocus(workspace, people));

  return (
    <div className="rounded-[22px] border border-rose/15 bg-rose/10 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-rose">
          <Sparkles aria-hidden="true" size={17} />
        </span>
        <div>
          <p className="text-sm font-bold text-rose">{copy.title}</p>
          <p className="mt-1 text-sm leading-6 text-soft-ink">{copy.prompt}</p>
        </div>
      </div>
    </div>
  );
}
