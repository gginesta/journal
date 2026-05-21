import Foundation

enum StreakCalculator {
    static func summary(entries: [JournalEntry], today: Date = .now, calendar: Calendar = .current) -> StreakSummary {
        let completedDays = Set(entries.filter(\.isComplete).map { calendar.startOfDay(for: $0.day) })
        guard !completedDays.isEmpty else {
            return StreakSummary(current: 0, longest: 0, completedDays: 0)
        }

        let current = currentStreak(completedDays: completedDays, today: today, calendar: calendar)
        let longest = longestStreak(completedDays: completedDays, calendar: calendar)
        return StreakSummary(current: current, longest: longest, completedDays: completedDays.count)
    }

    private static func currentStreak(completedDays: Set<Date>, today: Date, calendar: Calendar) -> Int {
        var cursor = calendar.startOfDay(for: today)
        if !completedDays.contains(cursor),
           let yesterday = calendar.date(byAdding: .day, value: -1, to: cursor),
           completedDays.contains(yesterday) {
            cursor = yesterday
        }

        var count = 0
        while completedDays.contains(cursor) {
            count += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: cursor) else { break }
            cursor = previous
        }
        return count
    }

    private static func longestStreak(completedDays: Set<Date>, calendar: Calendar) -> Int {
        let orderedDays = completedDays.sorted()
        var longest = 0
        var current = 0
        var previous: Date?

        for day in orderedDays {
            if let previous,
               let expected = calendar.date(byAdding: .day, value: 1, to: previous),
               calendar.isDate(expected, inSameDayAs: day) {
                current += 1
            } else {
                current = 1
            }
            longest = max(longest, current)
            previous = day
        }
        return longest
    }
}
