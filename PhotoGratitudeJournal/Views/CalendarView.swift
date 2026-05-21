import SwiftData
import SwiftUI

struct JournalCalendarView: View {
    @Environment(RouterPath.self) private var router
    @Query(sort: \JournalEntry.day, order: .reverse) private var entries: [JournalEntry]
    @State private var visibleMonth = Calendar.current.startOfDay(for: .now)

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 7)

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                monthControls
                weekdayHeader
                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(daysInVisibleMonth, id: \.self) { day in
                        CalendarDayCell(day: day, entry: entry(for: day))
                            .onTapGesture {
                                if let entry = entry(for: day) {
                                    router.navigate(to: .entry(entry.id))
                                }
                            }
                    }
                }
                .journalCard()
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Calendar")
    }

    private var monthControls: some View {
        HStack {
            Button {
                visibleMonth = Calendar.current.date(byAdding: .month, value: -1, to: visibleMonth) ?? visibleMonth
            } label: {
                Image(systemName: "chevron.left")
            }

            Spacer()
            Text(visibleMonth.formatted(.dateTime.month(.wide).year()))
                .font(.title3.bold())
            Spacer()

            Button {
                visibleMonth = Calendar.current.date(byAdding: .month, value: 1, to: visibleMonth) ?? visibleMonth
            } label: {
                Image(systemName: "chevron.right")
            }
        }
        .buttonStyle(.bordered)
    }

    private var weekdayHeader: some View {
        HStack {
            ForEach(Calendar.current.shortWeekdaySymbols, id: \.self) { symbol in
                Text(symbol)
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private var daysInVisibleMonth: [Date] {
        let calendar = Calendar.current
        guard let interval = calendar.dateInterval(of: .month, for: visibleMonth),
              let range = calendar.range(of: .day, in: .month, for: visibleMonth) else { return [] }

        let firstWeekday = calendar.component(.weekday, from: interval.start) - 1
        let blanks = (0..<firstWeekday).compactMap {
            calendar.date(byAdding: .day, value: -($0 + 1), to: interval.start)
        }.reversed()

        let monthDays = range.compactMap { day -> Date? in
            calendar.date(byAdding: .day, value: day - 1, to: interval.start)
        }

        return Array(blanks) + monthDays
    }

    private func entry(for day: Date) -> JournalEntry? {
        entries.first { Calendar.current.isDate($0.day, inSameDayAs: day) }
    }
}

private struct CalendarDayCell: View {
    let day: Date
    let entry: JournalEntry?

    var body: some View {
        VStack(spacing: 6) {
            Text(day.formatted(.dateTime.day()))
                .font(.subheadline.bold())
            HStack(spacing: 3) {
                if entry?.isComplete == true {
                    Circle().fill(Color.leaf).frame(width: 6, height: 6)
                }
                if (entry?.photos.count ?? 0) > 0 {
                    Image(systemName: "photo.fill")
                        .font(.caption2)
                        .foregroundStyle(.rose)
                }
            }
            .frame(height: 10)
        }
        .frame(height: 54)
        .frame(maxWidth: .infinity)
        .background(entry == nil ? Color.clear : Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
        .foregroundStyle(Calendar.current.isDateInToday(day) ? .rose : .primary)
    }
}
