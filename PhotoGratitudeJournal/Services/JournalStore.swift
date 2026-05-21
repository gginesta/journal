import Foundation
import SwiftData

enum JournalStore {
    static let defaultPersonTagSeeds: [(name: String, colorHex: String)] = [
        ("Me", "#5B8DEF"),
        ("Kid 1", "#F4A261"),
        ("Kid 2", "#2A9D8F"),
        ("Partner", "#E76F51"),
        ("Family", "#7C6F64")
    ]

    static func entry(for day: Date, in context: ModelContext) -> JournalEntry {
        let targetDay = Calendar.current.startOfDay(for: day)
        let descriptor = FetchDescriptor<JournalEntry>(
            predicate: #Predicate { $0.day == targetDay }
        )

        if let existing = try? context.fetch(descriptor).first {
            return existing
        }

        let entry = JournalEntry(day: targetDay)
        let prompts = PromptSeeder.enabledPrompts(in: context)
        entry.sessions = sessionKindsForNewEntry(in: context).enumerated().map { index, kind in
            makeSession(kind: kind, prompts: prompts, offset: index)
        }
        context.insert(entry)
        try? context.save()
        return entry
    }

    static func seedDefaultPersonTagsIfNeeded(in context: ModelContext) {
        let existingTags = allPersonTags(in: context)
        let existingNames = Set(existingTags.map { normalizedName($0.name) })

        for (index, seed) in defaultPersonTagSeeds.enumerated()
        where !existingNames.contains(normalizedName(seed.name)) {
            context.insert(PersonTag(
                name: seed.name,
                colorHex: seed.colorHex,
                sortOrder: index,
                isDefault: true
            ))
        }

        try? context.save()
    }

    static func allPersonTags(in context: ModelContext) -> [PersonTag] {
        let descriptor = FetchDescriptor<PersonTag>(
            sortBy: [
                SortDescriptor(\.sortOrder),
                SortDescriptor(\.name)
            ]
        )
        return (try? context.fetch(descriptor)) ?? []
    }

    static func addPersonTag(named name: String, colorHex: String = "#7C6F64", in context: ModelContext) -> PersonTag? {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return nil }

        let existingTags = allPersonTags(in: context)
        if let existing = existingTags.first(where: { normalizedName($0.name) == normalizedName(trimmedName) }) {
            return existing
        }

        let nextSortOrder = ((existingTags.map(\.sortOrder).max()) ?? -1) + 1
        let tag = PersonTag(
            name: trimmedName,
            colorHex: colorHex,
            sortOrder: nextSortOrder
        )
        context.insert(tag)
        try? context.save()
        return tag
    }

    static func addSession(kind: SessionKind, to entry: JournalEntry, using prompts: [PromptTemplate], in context: ModelContext) {
        let session = JournalSession(kind: kind)
        session.responses = prompts.map {
            PromptResponse(
                promptID: $0.id,
                promptTitle: $0.title,
                promptText: $0.prompt,
                promptOrder: $0.order
            )
        }
        var sessions = entry.sessions ?? []
        sessions.append(session)
        entry.sessions = sessions
        entry.updatedAt = .now
        try? context.save()
    }

    static func updateResponse(_ response: PromptResponse, text: String, in context: ModelContext) {
        response.text = text
        response.updatedAt = .now
        try? context.save()
    }

    static func updateMood(_ entry: JournalEntry, mood: Mood, in context: ModelContext) {
        entry.mood = mood
        entry.updatedAt = .now
        try? context.save()
    }

    static func addPhoto(_ photo: PhotoAttachment, to entry: JournalEntry, in context: ModelContext) {
        var photos = entry.photos ?? []
        photos.append(photo)
        entry.photos = photos
        entry.updatedAt = .now
        try? context.save()
    }

    static func removePhoto(_ photo: PhotoAttachment, from entry: JournalEntry, in context: ModelContext) {
        entry.photos = (entry.photos ?? []).filter { $0.id != photo.id }
        entry.updatedAt = .now
        context.delete(photo)
        try? context.save()
    }

    static func assignPersonTag(_ person: PersonTag, to entry: JournalEntry, in context: ModelContext) {
        guard !(entry.personLinks ?? []).contains(where: { $0.person?.id == person.id }) else { return }

        let link = EntryPersonTag(entry: entry, person: person)
        context.insert(link)
        var links = entry.personLinks ?? []
        links.append(link)
        entry.personLinks = links
        entry.updatedAt = .now
        try? context.save()
    }

    static func removePersonTag(_ person: PersonTag, from entry: JournalEntry, in context: ModelContext) {
        guard let link = (entry.personLinks ?? []).first(where: { $0.person?.id == person.id }) else { return }

        entry.personLinks = (entry.personLinks ?? []).filter { $0.id != link.id }
        entry.updatedAt = .now
        context.delete(link)
        try? context.save()
    }

    static func entries(_ entries: [JournalEntry], taggedWith person: PersonTag?) -> [JournalEntry] {
        guard let person else { return sortedEntries(entries) }
        return sortedEntries(entries.filter { entry in
            (entry.personLinks ?? []).contains { $0.person?.id == person.id }
        })
    }

    static func addLittleDetail(
        text: String,
        to entry: JournalEntry,
        people: [PersonTag] = [],
        in context: ModelContext
    ) -> MemoryDetail? {
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedText.isEmpty else { return nil }

        let nextOrder = ((entry.details ?? []).map(\.order).max() ?? -1) + 1
        let detail = MemoryDetail(text: trimmedText, order: nextOrder, entry: entry)
        context.insert(detail)

        var details = entry.details ?? []
        details.append(detail)
        entry.details = details

        for person in people {
            addUnsavedPersonTag(person, to: detail, in: context)
        }

        entry.updatedAt = .now
        try? context.save()
        return detail
    }

    static func assignPersonTag(_ person: PersonTag, to detail: MemoryDetail, in context: ModelContext) {
        guard addUnsavedPersonTag(person, to: detail, in: context) else { return }

        detail.updatedAt = .now
        detail.entry?.updatedAt = .now
        try? context.save()
    }

    static func removePersonTag(_ person: PersonTag, from detail: MemoryDetail, in context: ModelContext) {
        guard let link = (detail.personLinks ?? []).first(where: { $0.person?.id == person.id }) else { return }

        detail.personLinks = (detail.personLinks ?? []).filter { $0.id != link.id }
        detail.updatedAt = .now
        detail.entry?.updatedAt = .now
        context.delete(link)
        try? context.save()
    }

    static func removeLittleDetail(_ detail: MemoryDetail, from entry: JournalEntry, in context: ModelContext) {
        entry.details = (entry.details ?? []).filter { $0.id != detail.id }
        entry.updatedAt = .now
        context.delete(detail)
        try? context.save()
    }

    static func sortedEntries(_ entries: [JournalEntry]) -> [JournalEntry] {
        entries.sorted { $0.day > $1.day }
    }

    private static func addUnsavedPersonTag(_ person: PersonTag, to detail: MemoryDetail, in context: ModelContext) -> Bool {
        guard !(detail.personLinks ?? []).contains(where: { $0.person?.id == person.id }) else { return false }

        let link = DetailPersonTag(detail: detail, person: person)
        context.insert(link)
        var links = detail.personLinks ?? []
        links.append(link)
        detail.personLinks = links
        return true
    }

    private static func normalizedName(_ name: String) -> String {
        name.trimmingCharacters(in: .whitespacesAndNewlines).localizedLowercase
    }

    private static func sessionKindsForNewEntry(in context: ModelContext) -> [SessionKind] {
        let descriptor = FetchDescriptor<ReminderConfig>()
        let cadence = (try? context.fetch(descriptor).first?.cadence) ?? .evening
        return cadence.defaultSessionKinds
    }

    private static func makeSession(kind: SessionKind, prompts: [PromptTemplate], offset: Int = 0) -> JournalSession {
        let createdAt = Date.now.addingTimeInterval(TimeInterval(offset))
        let session = JournalSession(kind: kind, createdAt: createdAt, updatedAt: createdAt)
        session.responses = prompts.map {
            PromptResponse(
                promptID: $0.id,
                promptTitle: $0.title,
                promptText: $0.prompt,
                promptOrder: $0.order,
                createdAt: createdAt,
                updatedAt: createdAt
            )
        }
        return session
    }
}
