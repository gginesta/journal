import Foundation
import os
import SwiftData

/// Central persistence helper: save failures must never be silent. Failures
/// are logged and broadcast so the root view can show a gentle alert.
enum Persistence {
    static let saveFailedNotification = Notification.Name("PersistenceSaveFailed")

    private static let logger = Logger(
        subsystem: "com.guill.PhotoGratitudeJournal",
        category: "persistence"
    )

    @discardableResult
    static func save(_ context: ModelContext, operation: String) -> Bool {
        do {
            try context.save()
            return true
        } catch {
            report(operation, error: error)
            return false
        }
    }

    /// Log a failure and notify the UI so the user learns their change may
    /// not have been kept.
    static func report(_ operation: String, error: Error) {
        log(operation, error: error)
        NotificationCenter.default.post(name: saveFailedNotification, object: nil)
    }

    /// Log-only variant for failures that need no user action (for example
    /// cleaning up replaced photo files).
    static func log(_ operation: String, error: Error) {
        logger.error("\(operation, privacy: .public) failed: \(String(describing: error), privacy: .public)")
    }
}
