import Foundation

// Gratitude Guide: deterministic, mood-aware prompt starters. A 1:1 port of
// web/src/lib/prompts.ts — same packs, same copy, same seed-hash rotation —
// so the same (date, mood, relationships) input surfaces the same three
// suggestions on both platforms. Mood enters the seed via its SPEC-5 wire
// string ("low" … "glowing"), matching web's string-typed Mood.
struct GratitudePromptPack: Equatable {
    let id: String
    let title: String
    let suggestions: [String]
}

struct GratitudeGuide: Equatable {
    let pack: GratitudePromptPack
    let moodCopy: String
    let suggestions: [String]
}

enum GratitudeGuideService {
    static let packs: [GratitudePromptPack] = [
        GratitudePromptPack(
            id: "default-gratitude",
            title: "Small Gratitude",
            suggestions: [
                "Something ordinary that helped today",
                "A moment that felt easier than expected",
                "One small comfort I noticed",
                "A simple thing I am glad was here",
                "A tiny win I do not want to skip"
            ]
        ),
        GratitudePromptPack(
            id: "savoring",
            title: "Savoring",
            suggestions: [
                "A sound, smell, or color I want to remember",
                "A moment I would pause for one more second",
                "Something that felt warm, calm, or alive",
                "A good detail from the room, meal, walk, or weather",
                "One part of today that deserves a slower look"
            ]
        ),
        GratitudePromptPack(
            id: "appreciation",
            title: "Appreciation",
            suggestions: [
                "Someone made one ordinary part of the day easier",
                "A kindness I received or noticed",
                "A person, place, or routine I am grateful for",
                "Something helpful I did not have to carry alone",
                "A small effort from someone else that mattered"
            ]
        ),
        GratitudePromptPack(
            id: "self-kindness",
            title: "Self-kindness",
            suggestions: [
                "Something I handled as well as I could",
                "A way I was gentle with myself today",
                "One thing I can let be enough",
                "A choice that protected a little peace",
                "A small sign I kept going"
            ]
        ),
        GratitudePromptPack(
            id: "hard-day",
            title: "Hard Day",
            suggestions: [
                "One bearable moment, even if the day was hard",
                "Something that did not make things worse",
                "A tiny comfort I can honestly name",
                "One thing I got through",
                "A small kindness, rest, or breath I can keep"
            ]
        ),
        GratitudePromptPack(
            id: "family-relationships",
            title: "Family and Relationships",
            suggestions: [
                "A small exchange with someone I care about",
                "A routine, joke, phrase, or look worth keeping",
                "Someone being themselves in a way I want to remember",
                "A moment of care, patience, or repair",
                "A little togetherness from today"
            ]
        )
    ]

    static func guide(localDate: String, mood: Mood, hasRelationships: Bool = false) -> GratitudeGuide {
        let pack = selectPack(localDate: localDate, mood: mood, hasRelationships: hasRelationships)
        let startIndex = stableIndex("\(localDate):\(mood.wireName):\(pack.id)", modulo: pack.suggestions.count)
        return GratitudeGuide(
            pack: pack,
            moodCopy: moodCopy(for: mood),
            suggestions: Array(rotated(pack.suggestions, by: startIndex).prefix(3))
        )
    }

    // Adds a suggestion into the "three nice things" text: fills the first
    // blank visible line, appends a new line while under the limit, and joins
    // onto the last visible line ("; ") when all three are taken. A suggestion
    // already present as its own line is never duplicated.
    static func addSuggestion(_ suggestion: String, to currentText: String, visibleLineLimit: Int = 3) -> String {
        let trimmedSuggestion = suggestion.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedSuggestion.isEmpty else { return currentText }

        let alreadyUsed = currentText
            .components(separatedBy: "\n")
            .contains { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == trimmedSuggestion.lowercased() }
        if alreadyUsed { return currentText }

        if currentText.isEmpty { return trimmedSuggestion }

        var lines = currentText.components(separatedBy: "\n")
        if let firstBlankIndex = lines.prefix(visibleLineLimit)
            .firstIndex(where: { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) {
            lines[firstBlankIndex] = trimmedSuggestion
            return trimTrailingBlankLines(lines).joined(separator: "\n")
        }

        if lines.count < visibleLineLimit {
            lines.append(trimmedSuggestion)
            return lines.joined(separator: "\n")
        }

        let appendIndex = max(0, min(visibleLineLimit - 1, lines.count - 1))
        let existing = lines[appendIndex]
        let separator = existing.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "" : "; "
        lines[appendIndex] = existing + separator + trimmedSuggestion
        return lines.joined(separator: "\n")
    }

    // The seed's date component, matching web's yyyy-MM-dd localDate.
    static func localDateString(for date: Date, calendar: Calendar = .current) -> String {
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", components.year ?? 0, components.month ?? 0, components.day ?? 0)
    }

    // Same hash as web's stableIndex: hash = (hash * 31 + charCode) mod 2^32
    // over UTF-16 code units, then mod the option count.
    static func stableIndex(_ seed: String, modulo: Int) -> Int {
        guard modulo > 0 else { return 0 }
        var hash: UInt32 = 0
        for unit in seed.utf16 {
            hash = hash &* 31 &+ UInt32(unit)
        }
        return Int(hash % UInt32(modulo))
    }

    private static func moodCopy(for mood: Mood) -> String {
        switch mood {
        case .low:
            "If today was heavy, keep this honest and tiny. One bearable moment counts."
        case .quiet:
            "No need to make today louder. Notice one soft detail and leave the rest."
        case .good, .bright, .glowing:
            "Pick a starter or write your own. It will be added below your words."
        }
    }

    private static func selectPack(localDate: String, mood: Mood, hasRelationships: Bool) -> GratitudePromptPack {
        if mood == .low { return pack(withID: "hard-day") }
        if mood == .quiet { return pack(withID: "self-kindness") }

        let candidateIDs = hasRelationships
            ? ["family-relationships", "appreciation", "default-gratitude", "savoring", "self-kindness"]
            : ["default-gratitude", "savoring", "appreciation", "self-kindness"]
        let index = stableIndex("\(localDate):\(mood.wireName):\(hasRelationships)", modulo: candidateIDs.count)
        return pack(withID: candidateIDs[index])
    }

    private static func pack(withID id: String) -> GratitudePromptPack {
        packs.first { $0.id == id } ?? packs[0]
    }

    private static func rotated(_ suggestions: [String], by startIndex: Int) -> [String] {
        guard !suggestions.isEmpty else { return suggestions }
        return suggestions.indices.map { suggestions[(startIndex + $0) % suggestions.count] }
    }

    private static func trimTrailingBlankLines(_ lines: [String]) -> [String] {
        var next = lines
        while let last = next.last, last.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            next.removeLast()
        }
        return next
    }
}
