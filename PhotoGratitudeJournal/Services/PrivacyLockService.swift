import Foundation
import LocalAuthentication

@MainActor
@Observable
final class PrivacyLockService {
    var isEnabled = false
    var isLocked = false
    var lastError: String?

    func lockIfNeeded() async {
        if isEnabled {
            isLocked = true
        }
    }

    func unlock() async {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            lastError = error?.localizedDescription
            return
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: "Unlock your gratitude journal."
            )
            isLocked = !success
        } catch {
            lastError = error.localizedDescription
        }
    }
}
