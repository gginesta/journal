import Foundation
import SwiftData

enum JournalStore {
    static func entry(for day: Date, in context: ModelContext) -> JournalEntry {
        let targetDay = Calendar.current.startOfDay(for: day)
        let descriptor = FetchDescriptor<JournalEntry>(
            predicate: #Predicate { $0.day == targetDay }
        )

        if let existing = try? context.fetch(descriptor).first {
            return existing
        }

        let entry = JournalEntry(day: targetDay)
        let session = JournalSession(kind: .evening)
        session.responses = PromptSeeder.enabledPrompts(in: context).map {
            PromptResponse(
                promptID: $0.id,
                promptTitle: $0.title,
                promptText: $0.prompt,
                promptOrder: $0.order
            )
        }
        entry.sessions = [session]
        context.insert(entry)
        try? context.save()
        return entry
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

    static func sortedEntries(_ entries: [JournalEntry]) -> [JournalEntry] {
        entries.sorted { $0.day > $1.day }
    }
}
