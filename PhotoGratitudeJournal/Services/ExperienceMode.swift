import Foundation

// SPEC-7: the user-facing Simple/Full experience toggle.
//
// The mode changes only which UI surfaces render. It never changes data or
// the entry model — everything created in Full stays stored, still appears
// read-only where it already renders (entry detail, search), and returns
// fully editable when the user switches back. Mode is presentation-only.
//
// Pure logic only: no SwiftUI, no I/O. The capability map is transcribed from
// docs/SPEC.md SPEC-7 and asserted against spec/fixtures/experience-mode.json
// by SpecConformanceTests; web mirrors it 1:1 as web/src/lib/experience-mode.ts.
enum ExperienceMode: String, CaseIterable, Identifiable {
    case simple
    case full

    var id: String { rawValue }

    // New users start in Simple — it makes the "under a minute" promise
    // structural. (Web grandfathers pre-toggle accounts into Full via
    // migration; iOS has no shipped installs to grandfather.)
    static let defaultMode: ExperienceMode = .simple

    // The @AppStorage key shared by every view that reads the mode.
    static let storageKey = "experienceMode"

    static func fromStoredValue(_ value: String) -> ExperienceMode {
        ExperienceMode(rawValue: value) ?? defaultMode
    }

    var title: String {
        switch self {
        case .simple: "Simple"
        case .full: "Full"
        }
    }

    // Settings copy, matching web's ExperienceSection.
    var summary: String {
        switch self {
        case .simple:
            "A one-minute ritual — one photo, three nice things, done. Memory Lane still brings back the good days."
        case .full:
            "Everything — moods, people tags, Little Details, Gratitude Guide, Calendar and Insights."
        }
    }
}

// Every gateable surface, in capability-map order (docs/SPEC.md SPEC-7). Raw
// values are the shared fixture's feature keys. Surfaces without a key
// (Beta/Privacy/iCloud settings, onboarding, first-memory celebration, entry
// detail) always render in both modes.
enum ExperienceFeature: String, CaseIterable {
    case todayTab
    case memoriesTab
    case settingsTab
    case calendarTab
    case insightsTab
    case photoHero
    case threeNiceThings
    case completionCard
    case streakPill
    case moodPicker
    case peopleTags
    case littleDetailsPanel
    case gratitudeGuide
    case pickMeUpMemory
    case promptSnapshot
    case memoryLanePanel
    case memoriesSearch
    case memoriesFilters
    case detailsRepository
    case promptEditor
    case peopleTagEditor
    case remindersSection
    case workspacesSection
    case dataExport
    case experienceToggle
}

enum ExperienceModeMap {
    // The Simple column of the SPEC-7 capability matrix: the ritual itself
    // (photo + three lines + done), the read-only rediscovery payoff, and the
    // trust/plumbing Settings sections that must never gate.
    static let simpleFeatures: Set<ExperienceFeature> = [
        .todayTab,
        .memoriesTab,
        .settingsTab,
        .photoHero,
        .threeNiceThings,
        .completionCard,
        .streakPill,
        .memoryLanePanel,
        .memoriesSearch,
        .remindersSection,
        .workspacesSection,
        .dataExport,
        .experienceToggle
    ]

    static func isVisible(_ feature: ExperienceFeature, in mode: ExperienceMode) -> Bool {
        mode == .full || simpleFeatures.contains(feature)
    }

    static let tabOrder: [AppTab] = [.today, .memories, .calendar, .insights, .settings]

    static func visibleTabs(in mode: ExperienceMode) -> [AppTab] {
        tabOrder.filter { isVisible(feature(for: $0), in: mode) }
    }

    static func feature(for tab: AppTab) -> ExperienceFeature {
        switch tab {
        case .today: .todayTab
        case .memories: .memoriesTab
        case .calendar: .calendarTab
        case .insights: .insightsTab
        case .settings: .settingsTab
        }
    }
}
