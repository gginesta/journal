import Foundation
import LocalAuthentication

@MainActor
@Observable
final class PrivacyLockService {
    private static let isEnabledDefaultsKey = "privacyLockIsEnabled"

    var isEnabled: Bool {
        didSet {
            UserDefaults.standard.set(isEnabled, forKey: Self.isEnabledDefaultsKey)
            if !isEnabled {
                isLocked = false
            }
        }
    }

    var isLocked = false
    var lastError: String?

    init() {
        let enabled = UserDefaults.standard.bool(forKey: Self.isEnabledDefaultsKey)
        isEnabled = enabled
        // Start locked whenever the lock is enabled so a relaunch never shows
        // journal content before authentication.
        isLocked = enabled
    }

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
