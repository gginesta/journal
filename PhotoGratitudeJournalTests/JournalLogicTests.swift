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

    func testCompletionIsUnaffectedByLittleDetails() {
        let entry = JournalEntry(day: Date())
        entry.details = [
            MemoryDetail(text: "Tiny hand squeeze", order: 0)
        ]

        XCTAssertFalse(entry.isComplete)
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

    func testPersonTagSeederCreatesDefaultPeople() {
        let container = AppModelContainer.make(inMemory: true)
        let context = container.mainContext

        JournalStore.seedDefaultPersonTagsIfNeeded(in: context)
        JournalStore.seedDefaultPersonTagsIfNeeded(in: context)
        let tags = JournalStore.allPersonTags(in: context)

        XCTAssertEqual(tags.map(\.name), ["Me", "Kid 1", "Kid 2", "Partner", "Family"])
    }

    func testAddingAndFilteringPersonTags() throws {
        let container = AppModelContainer.make(inMemory: true)
        let context = container.mainContext
        let calendar = Calendar(identifier: .gregorian)
        let taggedEntry = JournalEntry(day: calendar.date(from: DateComponents(year: 2026, month: 5, day: 21))!)
        let untaggedEntry = JournalEntry(day: calendar.date(from: DateComponents(year: 2026, month: 5, day: 20))!)
        context.insert(taggedEntry)
        context.insert(untaggedEntry)

        let tag = try XCTUnwrap(JournalStore.addPersonTag(named: "Grandma", colorHex: "#B56576", in: context))
        JournalStore.assignPersonTag(tag, to: taggedEntry, in: context)
        JournalStore.assignPersonTag(tag, to: taggedEntry, in: context)

        XCTAssertEqual(taggedEntry.sortedPersonTags.map(\.name), ["Grandma"])
        XCTAssertEqual(taggedEntry.personLinks?.count, 1)
        XCTAssertEqual(JournalStore.entries([untaggedEntry, taggedEntry], taggedWith: tag).map(\.id), [taggedEntry.id])
    }

    func testDetailToPersonAssignment() throws {
        let container = AppModelContainer.make(inMemory: true)
        let context = container.mainContext
        let entry = JournalEntry(day: Date())
        context.insert(entry)

        let kid = try XCTUnwrap(JournalStore.addPersonTag(named: "Kid 1", in: context))
        let partner = try XCTUnwrap(JournalStore.addPersonTag(named: "Partner", in: context))
        let detail = try XCTUnwrap(JournalStore.addLittleDetail(text: "Asked for one more story", to: entry, people: [kid], in: context))

        JournalStore.assignPersonTag(partner, to: detail, in: context)
        JournalStore.assignPersonTag(kid, to: detail, in: context)

        XCTAssertEqual(entry.sortedDetails.map(\.text), ["Asked for one more story"])
        XCTAssertEqual(detail.sortedPersonTags.map(\.name), ["Kid 1", "Partner"])
        XCTAssertEqual(detail.personLinks?.count, 2)

        JournalStore.removeLittleDetail(detail, from: entry, in: context)

        XCTAssertTrue(entry.sortedDetails.isEmpty)
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
