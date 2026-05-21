import Foundation
import SwiftData

enum AppModelContainer {
    static let cloudKitContainerIdentifier = "iCloud.com.guill.PhotoGratitudeJournal"

    static func make(inMemory: Bool = false) -> ModelContainer {
        let schema = Schema([
            JournalEntry.self,
            JournalSession.self,
            PromptTemplate.self,
            PromptResponse.self,
            PhotoAttachment.self,
            PersonTag.self,
            EntryPersonTag.self,
            MemoryDetail.self,
            DetailPersonTag.self,
            ReminderConfig.self
        ])

        let configuration: ModelConfiguration
        if inMemory {
            configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        } else {
            configuration = ModelConfiguration(
                schema: schema,
                cloudKitDatabase: .private(cloudKitContainerIdentifier)
            )
        }

        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Unable to create SwiftData container: \(error)")
        }
    }
}
