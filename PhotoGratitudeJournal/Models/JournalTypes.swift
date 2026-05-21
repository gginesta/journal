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
    case onceDaily
    case morningEvening
    case anytime

    var id: String { rawValue }

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
}

enum EntitlementState: Equatable {
    case loading
    case free
    case premium(expiresAt: Date?)

    var hasPremium: Bool {
        if case .premium = self { true } else { false }
    }
}
