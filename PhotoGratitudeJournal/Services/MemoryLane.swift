import Foundation

enum MemoryLane {
    static func matches(today: Date, entries: [JournalEntry], calendar: Calendar = .current) -> [MemoryMatch] {
        let anchors: [(String, Date?)] = [
            ("1 month ago", calendar.date(byAdding: .month, value: -1, to: today)),
            ("1 year ago", calendar.date(byAdding: .year, value: -1, to: today)),
            ("2 years ago", calendar.date(byAdding: .year, value: -2, to: today)),
            ("3 years ago", calendar.date(byAdding: .year, value: -3, to: today))
        ]

        return anchors.compactMap { label, target in
            guard let target else { return nil }
            return closestEntry(to: target, label: label, entries: entries, calendar: calendar)
        }
    }

    private static func closestEntry(
        to targetDate: Date,
        label: String,
        entries: [JournalEntry],
        calendar: Calendar
    ) -> MemoryMatch? {
        let targetDay = calendar.startOfDay(for: targetDate)
        let candidate = entries
            .map { entry -> (JournalEntry, Int) in
                let distance = abs(calendar.dateComponents([.day], from: targetDay, to: calendar.startOfDay(for: entry.day)).day ?? Int.max)
                return (entry, distance)
            }
            .filter { $0.1 <= 3 }
            .sorted { lhs, rhs in
                if lhs.1 == rhs.1 {
                    return lhs.0.day > rhs.0.day
                }
                return lhs.1 < rhs.1
            }
            .first

        guard let candidate else { return nil }
        return MemoryMatch(
            label: label,
            targetDate: targetDay,
            entryID: candidate.0.id,
            entryDate: candidate.0.day,
            dayDistance: candidate.1
        )
    }
}
