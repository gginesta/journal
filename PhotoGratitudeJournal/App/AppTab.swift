import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
    case today
    case memories
    case calendar
    case insights
    case settings

    var id: String { rawValue }

    @ViewBuilder
    var content: some View {
        switch self {
        case .today:
            TodayView()
        case .memories:
            MemoriesView()
        case .calendar:
            JournalCalendarView()
        case .insights:
            InsightsView()
        case .settings:
            SettingsView()
        }
    }

    @ViewBuilder
    var label: some View {
        switch self {
        case .today:
            Label("Today", systemImage: "sun.max")
        case .memories:
            Label("Memories", systemImage: "photo.on.rectangle")
        case .calendar:
            Label("Calendar", systemImage: "calendar")
        case .insights:
            Label("Insights", systemImage: "chart.line.uptrend.xyaxis")
        case .settings:
            Label("Settings", systemImage: "gearshape")
        }
    }
}
