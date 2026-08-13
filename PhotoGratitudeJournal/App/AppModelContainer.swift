import Foundation
import SwiftData

enum AppModelContainer {
    static let cloudKitContainerIdentifier = "iCloud.com.guill.PhotoGratitudeJournal"

    static func make(inMemory: Bool = false) -> ModelContainer {
        let schema = Schema(versionedSchema: JournalSchemaV1.self)

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
            return try ModelContainer(for: schema, migrationPlan: JournalMigrationPlan.self, configurations: [configuration])
        } catch {
            fatalError("Unable to create SwiftData container: \(error)")
        }
    }
}
