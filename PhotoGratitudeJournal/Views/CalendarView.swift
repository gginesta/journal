import SwiftData
import SwiftUI

struct JournalCalendarView: View {
    @Environment(RouterPath.self) private var router
    @Query(sort: \JournalEntry.day, order: .reverse) private var entries: [JournalEntry]
    @State private var visibleMonth = Calendar.current.startOfDay(for: .now)

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: 7)

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                monthControls
                VStack(spacing: 8) {
                    weekdayHeader
                    LazyVGrid(columns: columns, spacing: 6) {
                        ForEach(daysInVisibleMonth) { day in
                            Button {
                                if let entry = entry(for: day.date) {
                                    router.navigate(to: .entry(entry.id))
                                }
                            } label: {
                                CalendarDayCell(day: day.date, isInVisibleMonth: day.isInVisibleMonth, entry: entry(for: day.date))
                            }
                            .buttonStyle(.plain)
                            .disabled(entry(for: day.date) == nil)
                            .accessibilityLabel(accessibilityLabel(for: day))
                        }
                    }
                    .padding(10)
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                }
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
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Previous month")

            Spacer()
            Text(visibleMonth.formatted(.dateTime.month(.wide).year()))
                .font(.title3.bold())
                .accessibilityAddTraits(.isHeader)
            Spacer()

            Button {
                visibleMonth = Calendar.current.date(byAdding: .month, value: 1, to: visibleMonth) ?? visibleMonth
            } label: {
                Image(systemName: "chevron.right")
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Next month")
        }
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

    private var daysInVisibleMonth: [CalendarMonthDay] {
        let calendar = Calendar.current
        guard let interval = calendar.dateInterval(of: .month, for: visibleMonth),
              let range = calendar.range(of: .day, in: .month, for: visibleMonth) else { return [] }

        let firstWeekday = calendar.component(.weekday, from: interval.start)
        let leadingDayCount = (firstWeekday - calendar.firstWeekday + 7) % 7
        let leadingDays = (0..<leadingDayCount).compactMap { offset in
            calendar.date(byAdding: .day, value: offset - leadingDayCount, to: interval.start)
        }

        let monthDays = range.compactMap { day -> Date? in
            calendar.date(byAdding: .day, value: day - 1, to: interval.start)
        }

        let visibleDates = leadingDays + monthDays
        let trailingDayCount = (7 - (visibleDates.count % 7)) % 7
        let trailingDays = (0..<trailingDayCount).compactMap { offset in
            calendar.date(byAdding: .day, value: offset + 1, to: monthDays.last ?? interval.start)
        }

        return (visibleDates + trailingDays).map { day in
            CalendarMonthDay(
                date: day,
                isInVisibleMonth: calendar.isDate(day, equalTo: visibleMonth, toGranularity: .month)
            )
        }
    }

    private func entry(for day: Date) -> JournalEntry? {
        entries.first { Calendar.current.isDate($0.day, inSameDayAs: day) }
    }

    private func accessibilityLabel(for day: CalendarMonthDay) -> String {
        let date = day.date.formatted(date: .long, time: .omitted)
        guard let entry = entry(for: day.date) else {
            return "\(date), no journal entry"
        }

        let photoCount = entry.sortedPhotos.count
        let photoLabel = photoCount == 1 ? "1 photo" : "\(photoCount) photos"
        let completion = entry.isComplete ? "complete" : "not complete"
        return "\(date), \(photoLabel), \(completion)"
    }
}

private struct CalendarMonthDay: Identifiable {
    let date: Date
    let isInVisibleMonth: Bool

    var id: Date { date }
}

private struct CalendarDayCell: View {
    let day: Date
    let isInVisibleMonth: Bool
    let entry: JournalEntry?

    var body: some View {
        VStack(spacing: 4) {
            Text(day.formatted(.dateTime.day()))
                .font(.callout.weight(Calendar.current.isDateInToday(day) ? .bold : .semibold))
                .frame(width: 30, height: 24)

            HStack(spacing: 4) {
                if (entry?.sortedPhotos.count ?? 0) > 0 {
                    Image(systemName: "photo.fill")
                        .font(.caption2)
                        .foregroundStyle(.rose)
                }
                if entry?.isComplete == true {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.caption2)
                        .foregroundStyle(.leaf)
                } else if entry != nil {
                    Image(systemName: "text.alignleft")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(height: 12)
        }
        .frame(height: 48)
        .frame(maxWidth: .infinity)
        .background(cellBackground, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Calendar.current.isDateInToday(day) ? Color.rose : Color(.separator).opacity(entry == nil ? 0.18 : 0), lineWidth: 1)
        }
        .foregroundStyle(Calendar.current.isDateInToday(day) ? .rose : .primary)
        .opacity(isInVisibleMonth ? 1 : 0.36)
        .accessibilityHidden(true)
    }

    private var cellBackground: Color {
        if entry == nil {
            Color.clear
        } else if (entry?.sortedPhotos.count ?? 0) > 0 {
            Color.rose.opacity(0.1)
        } else if entry?.isComplete == true {
            Color.leaf.opacity(0.1)
        } else {
            Color(.tertiarySystemBackground)
        }
    }
}
