import type { JournalEntry, MemoryDetail, PersonTag } from "../types/journal";

export type MemoryDetailCategory = MemoryDetail["category"];

export type MemoryDetailRepositoryItem = {
  id: string;
  detail: MemoryDetail;
  entry: JournalEntry;
  localDate: string;
  categoryLabel: string;
  people: PersonTag[];
};

export type MemoryDetailRepositoryFilters = {
  query?: string;
  personId?: string | null;
  category?: MemoryDetailCategory | "all";
};

export const memoryDetailCategoryLabels: Record<MemoryDetailCategory, string> = {
  note: "Note",
  phrase: "Phrase",
  favorite: "Favorite",
  routine: "Routine",
  milestone: "Milestone",
  quote: "Quote"
};

export function listMemoryDetails(
  entries: JournalEntry[],
  people: PersonTag[],
  filters: MemoryDetailRepositoryFilters = {}
): MemoryDetailRepositoryItem[] {
  const normalizedQuery = filters.query?.trim().toLowerCase() ?? "";

  return entries
    .flatMap((entry) =>
      entry.details
        .filter((detail) => detail.text.trim().length > 0)
        .map((detail) => {
          const taggedPeople = people.filter((person) => detail.personTagIds.includes(person.id));
          return {
            id: `${entry.id}:${detail.id}`,
            detail,
            entry,
            localDate: entry.localDate,
            categoryLabel: memoryDetailCategoryLabels[detail.category],
            people: taggedPeople
          };
        })
    )
    .filter((item) => {
      if (filters.personId && !item.people.some((person) => person.id === filters.personId)) return false;
      if (filters.category && filters.category !== "all" && item.detail.category !== filters.category) return false;
      if (!normalizedQuery) return true;

      const fields = [
        item.detail.text,
        item.localDate,
        item.detail.category,
        item.categoryLabel,
        ...item.people.map((person) => person.name)
      ];
      return fields.some((field) => field.toLowerCase().includes(normalizedQuery));
    })
    .sort((lhs, rhs) => {
      const dateOrder = rhs.localDate.localeCompare(lhs.localDate);
      if (dateOrder !== 0) return dateOrder;
      const sortOrder = lhs.detail.sortOrder - rhs.detail.sortOrder;
      if (sortOrder !== 0) return sortOrder;
      return lhs.detail.text.localeCompare(rhs.detail.text);
    });
}
