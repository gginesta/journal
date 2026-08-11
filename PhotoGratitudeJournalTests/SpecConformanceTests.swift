import Foundation
import SwiftData
import XCTest
@testable import PhotoGratitudeJournal

// Cross-platform SPEC conformance (docs/SPEC.md). These tests assert the same
// fixture cases as the web suite (web/tests/spec-conformance*.test.ts), so a
// platform can only drift by editing a shared fixture in spec/fixtures/ —
// which is loud in review.
@MainActor
final class SpecConformanceTests: XCTestCase {
    private let calendar = Calendar(identifier: .gregorian)

    // MARK: - SPEC-1 entry completion

    func testCompletionFixtureCases() throws {
        let fixture: CompletionFixture = try loadFixture(named: "completion")
        XCTAssertFalse(fixture.cases.isEmpty)

        for testCase in fixture.cases {
            XCTAssertEqual(
                EntryCompletion.isComplete(responseTexts: testCase.responses, photoCount: testCase.photoCount),
                testCase.expected,
                testCase.name
            )
        }
    }

    // MARK: - SPEC-2 streaks

    func testStreakFixtureCases() throws {
        let fixture: StreakFixture = try loadFixture(named: "streak")
        XCTAssertFalse(fixture.cases.isEmpty)

        for testCase in fixture.cases {
            let entries = testCase.completeDates.map { completeEntry(day: day($0)) }
            let summary = StreakCalculator.summary(entries: entries, today: day(testCase.today), calendar: calendar)

            XCTAssertEqual(summary.current, testCase.expected.current, "\(testCase.name): current")
            XCTAssertEqual(summary.longest, testCase.expected.longest, "\(testCase.name): longest")
            XCTAssertEqual(summary.completedDays, testCase.expected.completedDays, "\(testCase.name): completedDays")
        }
    }

    // MARK: - SPEC-3 Memory Lane ladder

    func testMemoryLaneFixtureCases() throws {
        let fixture: MemoryLaneFixture = try loadFixture(named: "memory-lane")
        XCTAssertFalse(fixture.cases.isEmpty)

        for testCase in fixture.cases {
            var entryIDsByFixtureID: [String: UUID] = [:]
            let entries = testCase.entries.map { spec -> JournalEntry in
                let entry = spec.complete ? completeEntry(day: day(spec.date)) : JournalEntry(day: day(spec.date))
                entryIDsByFixtureID[spec.id] = entry.id
                return entry
            }

            let matches = MemoryLane.matches(today: day(testCase.today), entries: entries, calendar: calendar)

            XCTAssertEqual(matches.count, testCase.expected.count, "\(testCase.name): match count")
            for (match, expected) in zip(matches, testCase.expected) {
                XCTAssertEqual(match.label, expected.label, "\(testCase.name): label")
                XCTAssertEqual(match.entryID, entryIDsByFixtureID[expected.entryId], "\(testCase.name): entry")
                XCTAssertEqual(match.dayDistance, expected.dayDistance, "\(testCase.name): dayDistance")
                XCTAssertEqual(match.isFallback, expected.label == MemoryLane.fallbackLabel, "\(testCase.name): fallback flag")
            }
        }
    }

    // MARK: - Helpers

    private func loadFixture<T: Decodable>(named name: String) throws -> T {
        let bundle = Bundle(for: SpecConformanceTests.self)
        let url = try XCTUnwrap(bundle.url(forResource: name, withExtension: "json"), "Missing fixture \(name).json in test bundle")
        return try JSONDecoder().decode(T.self, from: Data(contentsOf: url))
    }

    private func day(_ value: String) -> Date {
        let parts = value.split(separator: "-").compactMap { Int($0) }
        precondition(parts.count == 3, "Expected yyyy-MM-dd, got \(value)")
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))!
    }

    private func completeEntry(day: Date) -> JournalEntry {
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

private struct CompletionFixture: Decodable {
    struct Case: Decodable {
        let name: String
        let responses: [String]
        let photoCount: Int
        let details: [String]
        let expected: Bool
    }

    let cases: [Case]
}

private struct StreakFixture: Decodable {
    struct Expected: Decodable {
        let current: Int
        let longest: Int
        let completedDays: Int
    }

    struct Case: Decodable {
        let name: String
        let completeDates: [String]
        let today: String
        let expected: Expected
    }

    let cases: [Case]
}

private struct MemoryLaneFixture: Decodable {
    struct EntrySpec: Decodable {
        let id: String
        let date: String
        let complete: Bool
    }

    struct Expected: Decodable {
        let label: String
        let entryId: String
        let dayDistance: Int
    }

    struct Case: Decodable {
        let name: String
        let today: String
        let entries: [EntrySpec]
        let expected: [Expected]
    }

    let cases: [Case]
}
