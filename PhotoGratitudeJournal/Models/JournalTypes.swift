import Foundation

enum SessionKind: String, CaseIterable, Identifiable {
    case morning
    case evening
    case anytime

    var id: String { rawValue }

    var title: String {
        switch self {
        case .morning: "Morning"
        case .evening: "Evening"
        case .anytime: "Anytime"
        }
    }

    var icon: String {
        switch self {
        case .morning: "sunrise"
        case .evening: "moon.stars"
        case .anytime: "sparkles"
        }
    }
}

enum RitualCadence: String, CaseIterable, Identifiable {
    case evening
    case onceDaily = "once_daily"
    case morningEvening = "morning_evening"
    case anytime

    var id: String { rawValue }

    // SPEC-5: raw values are the snake_case wire strings shared with web.
    // Rows stored before the rename carry the old camelCase strings, so any
    // read from persisted storage must go through this mapping.
    static func fromStoredValue(_ value: String) -> RitualCadence? {
        if let cadence = RitualCadence(rawValue: value) {
            return cadence
        }
        switch value {
        case "onceDaily": return .onceDaily
        case "morningEvening": return .morningEvening
        default: return nil
        }
    }

    var title: String {
        switch self {
        case .evening: "Evening"
        case .onceDaily: "Once daily"
        case .morningEvening: "Morning + evening"
        case .anytime: "Anytime"
        }
    }

    var defaultSessionKinds: [SessionKind] {
        switch self {
        case .evening: [.evening]
        case .onceDaily: [.anytime]
        case .morningEvening: [.morning, .evening]
        case .anytime: [.anytime]
        }
    }
}

enum Mood: Int, CaseIterable, Identifiable {
    case low = 1
    case quiet = 2
    case good = 3
    case bright = 4
    case glowing = 5

    var id: Int { rawValue }

    var title: String {
        switch self {
        case .low: "Low"
        case .quiet: "Quiet"
        case .good: "Good"
        case .bright: "Bright"
        case .glowing: "Glowing"
        }
    }

    var symbol: String {
        switch self {
        case .low: "cloud.rain"
        case .quiet: "cloud"
        case .good: "sun.min"
        case .bright: "sun.max"
        case .glowing: "sparkles"
        }
    }

    // SPEC-5: canonical mood wire strings shared with web ("low", "quiet",
    // "good", "bright", "glowing"). Export and any future sync must use these,
    // never the display titles or raw Int values.
    var wireName: String {
        switch self {
        case .low: "low"
        case .quiet: "quiet"
        case .good: "good"
        case .bright: "bright"
        case .glowing: "glowing"
        }
    }

    init?(wireName: String) {
        switch wireName {
        case "low": self = .low
        case "quiet": self = .quiet
        case "good": self = .good
        case "bright": self = .bright
        case "glowing": self = .glowing
        default: return nil
        }
    }
}

// SPEC-5: the 6-value Little Details category union shared with web
// (`web/src/lib/memory-details.ts`). Raw values are the wire strings; titles
// match web's display labels.
enum MemoryDetailCategory: String, CaseIterable, Identifiable {
    case phrase
    case favorite
    case routine
    case milestone
    case quote
    case note

    var id: String { rawValue }

    var title: String {
        switch self {
        case .phrase: "Phrase"
        case .favorite: "Favorite"
        case .routine: "Routine"
        case .milestone: "Milestone"
        case .quote: "Quote"
        case .note: "Note"
        }
    }
}

struct StreakSummary: Equatable {
    let current: Int
    let longest: Int
    let completedDays: Int
}

struct MemoryMatch: Identifiable, Equatable {
    let id = UUID()
    let label: String
    let targetDate: Date
    let entryID: UUID
    let entryDate: Date
    let dayDistance: Int
    // SPEC-3: true only for the "Recent good thing" fallback returned when no
    // ladder target matches.
    var isFallback = false
}

enum EntitlementState: Equatable {
    case loading
    case free
    case premium(expiresAt: Date?)

    var hasPremium: Bool {
        if case .premium = self { true } else { false }
    }
}
