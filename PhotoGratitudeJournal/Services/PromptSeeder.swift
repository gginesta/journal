import Foundation
import SwiftData

enum PromptSeeder {
    static let defaults: [(String, String)] = [
        ("Nice things", "What are 3 nice things that happened today?"),
        ("Smile", "What made you smile?"),
        ("Remember", "What do you want to remember from today?")
    ]

    static func seedIfNeeded(in context: ModelContext) {
        let descriptor = FetchDescriptor<PromptTemplate>()
        let count = (try? context.fetchCount(descriptor)) ?? 0
        guard count == 0 else { return }

        for (index, item) in defaults.enumerated() {
            context.insert(PromptTemplate(
                title: item.0,
                prompt: item.1,
                order: index,
                isDefault: true
            ))
        }

        if (try? context.fetch(FetchDescriptor<ReminderConfig>()).isEmpty) == true {
            context.insert(ReminderConfig())
        }

        Persistence.save(context, operation: "Seed prompts")
    }

    static func enabledPrompts(in context: ModelContext) -> [PromptTemplate] {
        let descriptor = FetchDescriptor<PromptTemplate>(
            predicate: #Predicate { $0.isEnabled == true },
            sortBy: [SortDescriptor(\.order)]
        )
        return (try? context.fetch(descriptor)) ?? []
    }
}
