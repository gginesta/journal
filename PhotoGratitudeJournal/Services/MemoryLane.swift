import Foundation

// SPEC-3: the 10-target Memory Lane ladder shared with web
// (`memoryLaneMatches` in `web/src/lib/journal-logic.ts`). Only strictly-past,
// complete entries are eligible; an entry serves at most one target; results
// keep ladder order and are capped at four. When no target matches, the most
// recent eligible entry is returned as a single "Recent good thing" fallback.
enum MemoryLane {
    struct Target {
        let label: String
        let date: Date
        let tolerance: Int
    }

    static let matchLimit = 4
    static let fallbackLabel = "Recent good thing"

    static func matches(today: Date, entries: [JournalEntry], calendar: Calendar = .current) -> [MemoryMatch] {
        let todayStart = calendar.startOfDay(for: today)
        let eligibleEntries = entries
            .filter { calendar.startOfDay(for: $0.day) < todayStart && $0.isComplete }
            .sorted { $0.day > $1.day }

        var usedEntryIDs = Set<UUID>()
        var matches: [MemoryMatch] = []

        for target in targets(today: todayStart, calendar: calendar) {
            let candidate = eligibleEntries
                .filter { !usedEntryIDs.contains($0.id) }
                .map { entry -> (JournalEntry, Int) in
                    (entry, dayDistance(from: target.date, to: entry.day, calendar: calendar))
                }
                .filter { $0.1 <= target.tolerance }
                .sorted { lhs, rhs in
                    if lhs.1 == rhs.1 {
                        return lhs.0.day > rhs.0.day
                    }
                    return lhs.1 < rhs.1
                }
                .first

            guard let candidate else { continue }
            usedEntryIDs.insert(candidate.0.id)
            matches.append(MemoryMatch(
                label: target.label,
                targetDate: target.date,
                entryID: candidate.0.id,
                entryDate: candidate.0.day,
                dayDistance: candidate.1
            ))
        }

        if !matches.isEmpty {
            return Array(matches.prefix(matchLimit))
        }

        guard let recent = eligibleEntries.first else { return [] }
        return [MemoryMatch(
            label: fallbackLabel,
            targetDate: calendar.startOfDay(for: recent.day),
            entryID: recent.id,
            entryDate: recent.day,
            dayDistance: dayDistance(from: todayStart, to: recent.day, calendar: calendar),
            isFallback: true
        )]
    }

    // Ladder order and per-target tolerances are pinned by SPEC-3; keep in
    // sync with the web targets table and `spec/fixtures/memory-lane.json`.
    static func targets(today: Date, calendar: Calendar = .current) -> [Target] {
        func target(_ label: String, _ date: Date?, tolerance: Int) -> Target? {
            guard let date else { return nil }
            return Target(label: label, date: calendar.startOfDay(for: date), tolerance: tolerance)
        }

        return [
            target("1 year ago", calendar.date(byAdding: .year, value: -1, to: today), tolerance: 3),
            target("2 years ago", calendar.date(byAdding: .year, value: -2, to: today), tolerance: 3),
            target("3 years ago", calendar.date(byAdding: .year, value: -3, to: today), tolerance: 3),
            target("6 months ago", calendar.date(byAdding: .month, value: -6, to: today), tolerance: 7),
            target("3 months ago", calendar.date(byAdding: .month, value: -3, to: today), tolerance: 5),
            target("1 month ago", calendar.date(byAdding: .month, value: -1, to: today), tolerance: 3),
            target("2 weeks ago", calendar.date(byAdding: .day, value: -14, to: today), tolerance: 2),
            target("1 week ago", calendar.date(byAdding: .day, value: -7, to: today), tolerance: 2),
            target("3 days ago", calendar.date(byAdding: .day, value: -3, to: today), tolerance: 1),
            target("Yesterday", calendar.date(byAdding: .day, value: -1, to: today), tolerance: 0)
        ].compactMap { $0 }
    }

    private static func dayDistance(from lhs: Date, to rhs: Date, calendar: Calendar) -> Int {
        let start = calendar.startOfDay(for: lhs)
        let end = calendar.startOfDay(for: rhs)
        return abs(calendar.dateComponents([.day], from: start, to: end).day ?? Int.max)
    }
}
