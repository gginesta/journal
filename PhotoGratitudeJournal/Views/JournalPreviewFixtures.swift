import Foundation
import SwiftUI

enum JournalPreviewFixtures {
    static let today = Calendar(identifier: .gregorian).date(from: DateComponents(year: 2026, month: 5, day: 21)) ?? .now
    static let currentStreak = StreakSummary(current: 6, longest: 11, completedDays: 24)

    static let emptyTitle = "Start with one good moment"
    static let emptyMessage = "Add a photo, a sentence, or both. This can stay small."

    static let memoryCards: [JournalMemoryFixture] = [
        JournalMemoryFixture(
            title: "Dinner after the rain",
            date: Calendar(identifier: .gregorian).date(from: DateComponents(year: 2025, month: 5, day: 21)) ?? .now,
            subtitle: "May 21, 2025",
            excerpt: "The table was crowded, the food was warm, and nobody hurried.",
            isExactDate: true
        ),
        JournalMemoryFixture(
            title: "A quiet walk home",
            date: Calendar(identifier: .gregorian).date(from: DateComponents(year: 2024, month: 5, day: 19)) ?? .now,
            subtitle: "Around this day in 2024",
            excerpt: "Golden light on the sidewalk and a song I had forgotten.",
            isExactDate: false
        )
    ]
}

struct JournalMemoryFixture: Identifiable {
    let id = UUID()
    let title: String
    let date: Date
    let subtitle: String
    let excerpt: String
    let photoURL: URL?
    let isExactDate: Bool

    init(
        title: String,
        date: Date,
        subtitle: String,
        excerpt: String,
        photoURL: URL? = nil,
        isExactDate: Bool
    ) {
        self.title = title
        self.date = date
        self.subtitle = subtitle
        self.excerpt = excerpt
        self.photoURL = photoURL
        self.isExactDate = isExactDate
    }
}

#if DEBUG
    #Preview("Design Foundation") {
        JournalScreen(
            title: "What felt good today?",
            subtitle: JournalPreviewFixtures.today.formatted(date: .complete, time: .omitted)
        ) {
            HStack {
                StreakPill(days: JournalPreviewFixtures.currentStreak.current)
                CompletionBanner(isComplete: true)
            }

            PhotoHero(imageURL: nil)

            PhotoPickerSlot(action: {})

            EmptyJournalState(
                title: JournalPreviewFixtures.emptyTitle,
                message: JournalPreviewFixtures.emptyMessage,
                actionTitle: "Add photo",
                action: {}
            )

            JournalSection("Memory Lane", systemImage: "clock.arrow.circlepath") {
                ForEach(JournalPreviewFixtures.memoryCards) { memory in
                    MemoryCard(
                        title: memory.title,
                        date: memory.date,
                        subtitle: memory.subtitle,
                        excerpt: memory.excerpt,
                        photoURL: memory.photoURL,
                        isExactDate: memory.isExactDate
                    )
                }
            }
        }
    }
#endif
