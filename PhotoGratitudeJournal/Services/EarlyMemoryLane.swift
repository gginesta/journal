import Foundation

// Early Memory Lane guidance: the empty/early-state copy shown before the
// SPEC-3 ladder has anything to return. A port of
// web/src/lib/early-memory-lane.ts — same milestones, thresholds, and copy.
struct EarlyMemoryLaneMilestone: Identifiable, Equatable {
    let id: String
    let label: String
    let value: String
    let message: String
    let threshold: Int
    let isReady: Bool
    let remainingEntries: Int
    let statusLabel: String
}

struct EarlyMemoryLaneSummary: Equatable {
    let completedEntryCount: Int
    let headline: String
    let body: String
    let nextMilestone: EarlyMemoryLaneMilestone?
    let progressLabel: String
    let milestones: [EarlyMemoryLaneMilestone]
}

enum EarlyMemoryLane {
    private struct Blueprint {
        let id: String
        let label: String
        let value: String
        let message: String
        let threshold: Int
    }

    private static let blueprints: [Blueprint] = [
        Blueprint(
            id: "yesterday",
            label: "Yesterday",
            value: "1 kept day",
            message: "After the first saved entry, Memory Lane can start returning yesterday's small good thing.",
            threshold: 1
        ),
        Blueprint(
            id: "last-week",
            label: "Last week",
            value: "7 kept days",
            message: "A week of entries gives the lane enough texture to bring back this time last week.",
            threshold: 7
        ),
        Blueprint(
            id: "one-month",
            label: "One month",
            value: "30 kept days",
            message: "As the month fills in, older photos and notes can return when they feel newly useful.",
            threshold: 30
        ),
        Blueprint(
            id: "anniversary",
            label: "Future anniversaries",
            value: "365 kept days",
            message: "The longer the journal grows, the more birthdays, seasons, and annual rhythms can resurface.",
            threshold: 365
        )
    ]

    static func summary(completedEntryCount: Int) -> EarlyMemoryLaneSummary {
        let safeCount = max(0, completedEntryCount)
        let milestones = blueprints.map { blueprint -> EarlyMemoryLaneMilestone in
            let remaining = max(blueprint.threshold - safeCount, 0)
            return EarlyMemoryLaneMilestone(
                id: blueprint.id,
                label: blueprint.label,
                value: blueprint.value,
                message: blueprint.message,
                threshold: blueprint.threshold,
                isReady: remaining == 0,
                remainingEntries: remaining,
                statusLabel: remaining == 0 ? "Ready now" : "\(remaining) more \(entryWord(remaining))"
            )
        }
        let nextMilestone = milestones.first { !$0.isReady }

        let body: String
        if safeCount == 0 {
            body = "Save one photo, note, or tiny detail and this space will have somewhere warm to begin."
        } else {
            body = "Every kept entry gives Memory Lane more to bring back: yesterday, last week, "
                + "one month, and future anniversaries as your journal grows."
        }

        let progressLabel: String
        if let nextMilestone {
            progressLabel = "\(nextMilestone.statusLabel) until \(nextMilestone.label.lowercased()) starts showing up."
        } else {
            progressLabel = "Your journal has enough history for anniversary memories to keep returning."
        }

        return EarlyMemoryLaneSummary(
            completedEntryCount: safeCount,
            headline: "Your Memory Lane is starting.",
            body: body,
            nextMilestone: nextMilestone,
            progressLabel: progressLabel,
            milestones: milestones
        )
    }

    private static func entryWord(_ count: Int) -> String {
        count == 1 ? "entry" : "entries"
    }
}
