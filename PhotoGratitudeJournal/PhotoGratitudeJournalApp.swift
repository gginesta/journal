import SwiftData
import SwiftUI

@main
struct PhotoGratitudeJournalApp: App {
    private let container: ModelContainer
    @State private var reminderScheduler = ReminderScheduler()
    @State private var entitlementService = EntitlementService()
    @State private var privacyLock = PrivacyLockService()
    @State private var photoStore = PhotoStore()

    init() {
        container = AppModelContainer.make()
        PromptSeeder.seedIfNeeded(in: container.mainContext)
    }

    var body: some Scene {
        WindowGroup {
            RootAppView()
                .modelContainer(container)
                .environment(reminderScheduler)
                .environment(entitlementService)
                .environment(privacyLock)
                .environment(photoStore)
                .task {
                    await entitlementService.refresh()
                    await reminderScheduler.refreshAuthorizationStatus()
                }
        }
    }
}
