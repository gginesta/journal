import Foundation
import SwiftData

// Versioned-schema baseline (improvement plan P0 0.6). The store has never
// shipped outside local development, so V1 is pinned to the *current* model
// set — including `MemoryDetail.category`, which landed in the same wave —
// rather than reconstructing a pre-change snapshot the shared @Model classes
// can no longer express. Future model changes must add a `JournalSchemaV2`
// referencing new class definitions plus a MigrationStage here instead of
// mutating V1.
enum JournalSchemaV1: VersionedSchema {
    static var versionIdentifier: Schema.Version {
        Schema.Version(1, 0, 0)
    }

    static var models: [any PersistentModel.Type] {
        [
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
        ]
    }
}

enum JournalMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] {
        [JournalSchemaV1.self]
    }

    static var stages: [MigrationStage] {
        []
    }
}
