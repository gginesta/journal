import type { JournalBootstrap, JournalEntry, PersonTag, PromptTemplate } from "@/types/journal";
import { addMonths, addYears, toLocalDate } from "@/lib/dates";

const workspaceId = "workspace-household";

export const demoPeople: PersonTag[] = [
  { id: "me", workspaceId, name: "Me", color: "#5B8DEF", sortOrder: 0, isDefault: true },
  { id: "kid-1", workspaceId, name: "Kid 1", color: "#F4A261", sortOrder: 1, isDefault: true },
  { id: "kid-2", workspaceId, name: "Kid 2", color: "#2A9D8F", sortOrder: 2, isDefault: true },
  { id: "partner", workspaceId, name: "Partner", color: "#E76F51", sortOrder: 3, isDefault: true },
  { id: "family", workspaceId, name: "Family", color: "#7C6F64", sortOrder: 4, isDefault: true }
];

export const demoPrompts: PromptTemplate[] = [
  {
    id: "prompt-nice-things",
    workspaceId,
    title: "Nice things",
    prompt: "What are 3 nice things that happened today?",
    sortOrder: 0,
    isEnabled: true,
    isDefault: true
  },
  {
    id: "prompt-smile",
    workspaceId,
    title: "Smile",
    prompt: "What made you smile?",
    sortOrder: 1,
    isEnabled: true,
    isDefault: true
  },
  {
    id: "prompt-remember",
    workspaceId,
    title: "Remember",
    prompt: "What do you want to remember from today?",
    sortOrder: 2,
    isEnabled: true,
    isDefault: true
  }
];

function makeEntry(id: string, localDate: string, photoUrl: string, text: string, people: string[]): JournalEntry {
  return {
    id,
    workspaceId,
    localDate,
    mood: "good",
    note: "",
    personTagIds: people,
    createdAt: `${localDate}T20:00:00.000Z`,
    updatedAt: `${localDate}T20:30:00.000Z`,
    photos: photoUrl
      ? [
          {
            id: `${id}-photo`,
            entryId: id,
            storagePath: "",
            thumbnailPath: "",
            previewUrl: photoUrl,
            caption: "",
            sortOrder: 0,
            createdAt: `${localDate}T20:00:00.000Z`
          }
        ]
      : [],
    sessions: [
      {
        id: `${id}-session`,
        kind: "evening",
        responses: demoPrompts.map((prompt, index) => ({
          id: `${id}-response-${index}`,
          promptId: prompt.id,
          promptTitle: prompt.title,
          promptText: prompt.prompt,
          promptOrder: prompt.sortOrder,
          text: index === 0 ? text : ""
        }))
      }
    ],
    details: [
      {
        id: `${id}-detail`,
        entryId: id,
        text: id.includes("kid") ? "Still says 'lellow' instead of yellow." : "A quiet walk after dinner.",
        category: id.includes("kid") ? "phrase" : "note",
        sortOrder: 0,
        personTagIds: people
      }
    ]
  };
}

export function makeDemoBootstrap(): JournalBootstrap {
  const today = toLocalDate();
  const entries = [
    makeEntry("today", today, "", "Bath-time laughter\nA good cup of tea\nEveryone at the table for dinner", ["family"]),
    makeEntry(
      "kid-memory",
      addMonths(today, -1),
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      "A sunny park loop and a tiny hand holding mine.",
      ["kid-1", "family"]
    ),
    makeEntry(
      "year-memory",
      addYears(today, -1),
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
      "First beach day of the season.",
      ["partner", "family"]
    )
  ];

  return {
    mode: "demo",
    profile: {
      id: "demo-user",
      email: "demo@photojournal.local",
      displayName: "Demo User"
    },
    workspaces: [
      { id: "workspace-personal", name: "My journal", kind: "personal", role: "owner" },
      { id: workspaceId, name: "Family journal", kind: "household", role: "owner" }
    ],
    activeWorkspaceId: workspaceId,
    people: demoPeople,
    prompts: demoPrompts,
    entries,
    reminders: {
      cadence: "evening",
      remindersEnabled: false,
      eveningTime: "21:00",
      morningTime: "08:30"
    }
  };
}
