import SwiftData
import XCTest
@testable import PhotoGratitudeJournal

@MainActor
final class JournalLogicTests: XCTestCase {
    func testCompletionAllowsTextOnly() {
        XCTAssertTrue(EntryCompletion.isComplete(responseTexts: ["A kind call"], photoCount: 0))
    }

    func testCompletionAllowsPhotoOnly() {
        XCTAssertTrue(EntryCompletion.isComplete(responseTexts: [""], photoCount: 1))
    }

    func testCompletionRejectsEmptyEntry() {
        XCTAssertFalse(EntryCompletion.isComplete(responseTexts: ["  ", ""], photoCount: 0))
    }

    func testStreakSummaryCountsCurrentAndLongestStreak() {
        let calendar = Calendar(identifier: .gregorian)
        let today = calendar.date(from: DateComponents(year: 2026, month: 5, day: 21))!
        let entries = [
            completeEntry(day: today, calendar: calendar),
            completeEntry(day: calendar.date(byAdding: .day, value: -1, to: today)!, calendar: calendar),
            completeEntry(day: calendar.date(byAdding: .day, value: -2, to: today)!, calendar: calendar),
            completeEntry(day: calendar.date(byAdding: .day, value: -6, to: today)!, calendar: calendar),
            completeEntry(day: calendar.date(byAdding: .day, value: -7, to: today)!, calendar: calendar)
        ]

        let summary = StreakCalculator.summary(entries: entries, today: today, calendar: calendar)

        XCTAssertEqual(summary.current, 3)
        XCTAssertEqual(summary.longest, 3)
        XCTAssertEqual(summary.completedDays, 5)
    }

    func testMemoryLaneFindsClosestEntryWithinThreeDays() {
        let calendar = Calendar(identifier: .gregorian)
        let today = calendar.date(from: DateComponents(year: 2026, month: 5, day: 21))!
        let closePast = calendar.date(from: DateComponents(year: 2025, month: 5, day: 19))!
        let tooFarPast = calendar.date(from: DateComponents(year: 2024, month: 5, day: 10))!

        let matches = MemoryLane.matches(
            today: today,
            entries: [completeEntry(day: closePast, calendar: calendar), completeEntry(day: tooFarPast, calendar: calendar)],
            calendar: calendar
        )

        XCTAssertEqual(matches.count, 1)
        XCTAssertEqual(matches.first?.label, "1 year ago")
        XCTAssertEqual(matches.first?.dayDistance, 2)
    }

    func testPromptSeederCreatesDefaultPrompts() {
        let container = AppModelContainer.make(inMemory: true)
        let context = container.mainContext

        PromptSeeder.seedIfNeeded(in: context)
        let prompts = PromptSeeder.enabledPrompts(in: context)

        XCTAssertEqual(prompts.map(\.prompt), [
            "What are 3 nice things that happened today?",
            "What made you smile?",
            "What do you want to remember from today?"
        ])
    }

    private func completeEntry(day: Date, calendar: Calendar) -> JournalEntry {
        let response = PromptResponse(
            promptID: UUID(),
            promptTitle: "Nice things",
            promptText: "What went well?",
            promptOrder: 0,
            text: "Something good"
        )
        let session = JournalSession(kind: .evening, responses: [response])
        return JournalEntry(day: calendar.startOfDay(for: day), sessions: [session])
    }
}
