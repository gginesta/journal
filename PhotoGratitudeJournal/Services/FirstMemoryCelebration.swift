import Foundation

// First-memory celebration: shown once, right after the very first meaningful
// entry (a typed response or a photo — the SPEC-1 completion inputs) is saved,
// until dismissed. A port of web/src/lib/first-memory-celebration.ts.
enum FirstMemoryCelebration {
    // The @AppStorage key for the one-time dismissal.
    static let dismissalStorageKey = "hasDismissedFirstMemoryCelebration"

    struct ReturnWindow: Identifiable, Equatable {
        let id: String
        let label: String
        let message: String
    }

    static let returnWindows: [ReturnWindow] = [
        ReturnWindow(
            id: "tomorrow",
            label: "Tomorrow",
            message: "A small nudge can bring this first memory back while it still feels close."
        ),
        ReturnWindow(
            id: "next-week",
            label: "Next week",
            message: "Memory Lane can turn today into a gentle look-back when the week has moved on."
        ),
        ReturnWindow(
            id: "one-month",
            label: "One month",
            message: "Soon it can become a monthly marker of what mattered right now."
        )
    ]

    enum EntryKind {
        case text
        case photo
        case mixed
        case memory

        var savedCopy: String {
            switch self {
            case .text: "Your words are saved."
            case .photo: "Your photo is saved."
            case .mixed: "Your words and photo are saved."
            case .memory: "Your first memory is saved."
            }
        }
    }

    static func isMeaningful(_ entry: JournalEntry) -> Bool {
        hasTypedResponse(entry) || !entry.sortedPhotos.isEmpty
    }

    static func meaningfulEntries(_ entries: [JournalEntry]) -> [JournalEntry] {
        entries.filter(isMeaningful)
    }

    static func shouldShow(entries: [JournalEntry], dismissed: Bool) -> Bool {
        !dismissed && meaningfulEntries(entries).count == 1
    }

    static func kind(for entry: JournalEntry?) -> EntryKind {
        guard let entry else { return .memory }

        let hasText = hasTypedResponse(entry)
        let hasPhoto = !entry.sortedPhotos.isEmpty

        if hasText && hasPhoto { return .mixed }
        if hasPhoto { return .photo }
        if hasText { return .text }
        return .memory
    }

    private static func hasTypedResponse(_ entry: JournalEntry) -> Bool {
        entry.sortedSessions
            .flatMap(\.sortedResponses)
            .contains { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }
}
