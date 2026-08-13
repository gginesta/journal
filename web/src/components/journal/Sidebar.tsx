import clsx from "clsx";
import { CalendarDays, Camera, Home, Lock, Settings, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Workspace } from "@/types/journal";
import { visibleTabs, type ExperienceMode } from "@/lib/experience-mode";
import { type AppTab, type SaveState } from "@/components/journal/helpers";
import { SaveStatePill } from "@/components/journal/shared";

const tabs: Array<{ id: AppTab; title: string; icon: LucideIcon }> = [
  { id: "today", title: "Today", icon: Home },
  { id: "memories", title: "Memories", icon: Camera },
  { id: "calendar", title: "Calendar", icon: CalendarDays },
  { id: "insights", title: "Insights", icon: Sparkles },
  { id: "settings", title: "Settings", icon: Settings }
];

// Simple mode drops the analysis tabs (SPEC-7); Settings always stays so the
// toggle remains reachable.
function tabsForMode(experienceMode: ExperienceMode) {
  const visible = visibleTabs(experienceMode);
  return tabs.filter((item) => visible.some((tab) => tab === item.id));
}

export function Sidebar({
  activeTab,
  setTab,
  experienceMode,
  workspaces,
  activeWorkspaceId,
  setActiveWorkspaceId,
  saveState,
  saveError,
  mode
}: {
  activeTab: AppTab;
  setTab: (tab: AppTab) => void;
  experienceMode: ExperienceMode;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
  saveState: SaveState;
  saveError: string | null;
  mode: "demo" | "supabase";
}) {
  return (
    <aside aria-label="Journal sidebar" className="sticky top-0 hidden h-screen border-r border-journal-line bg-journal-surface/82 px-5 py-6 backdrop-blur lg:block">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-rose/10 text-rose">
            <Camera aria-hidden="true" size={22} />
          </span>
          <div>
            <p className="font-bold leading-tight">Photo Gratitude</p>
            <p className="text-xs text-warm-gray">private web beta</p>
          </div>
        </div>

        <label className="mt-8 grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-warm-gray">
          Journal
          <select
            value={activeWorkspaceId}
            onChange={(event) => setActiveWorkspaceId(event.target.value)}
            className="min-h-11 rounded-2xl border border-journal-line bg-white px-3 text-sm font-semibold normal-case tracking-normal text-ink outline-none focus:ring-4 focus:ring-rose/15"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>

        <nav aria-label="Journal sections" className="mt-7 grid gap-2">
          {tabsForMode(experienceMode).map((item) => (
            <NavButton key={item.id} item={item} active={activeTab === item.id} onClick={() => setTab(item.id)} />
          ))}
        </nav>

        <div className="mt-auto rounded-journal border border-journal-line bg-journal-raised p-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Lock aria-hidden="true" size={16} />
            {mode === "demo" ? "Local demo" : "Private sync"}
          </p>
          <p className="mt-2 text-sm leading-5 text-warm-gray">
            {mode === "demo" ? "Changes are saved in this browser for review." : "Supabase RLS keeps each workspace private."}
          </p>
          <SaveStatePill state={saveState} error={saveError} />
          {saveError ? <p className="mt-2 text-xs leading-5 text-warm-gray">{saveError}</p> : null}
        </div>
      </div>
    </aside>
  );
}

function NavButton({
  item,
  active,
  onClick
}: {
  item: { id: AppTab; title: string; icon: LucideIcon };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex min-h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold transition",
        active ? "bg-rose/10 text-rose" : "text-soft-ink hover:bg-journal-raised"
      )}
    >
      <Icon aria-hidden="true" size={19} />
      {item.title}
    </button>
  );
}
