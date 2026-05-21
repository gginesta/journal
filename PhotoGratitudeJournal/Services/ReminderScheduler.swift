import Foundation
import UserNotifications

@MainActor
@Observable
final class ReminderScheduler {
    var authorizationStatus: UNAuthorizationStatus = .notDetermined

    func refreshAuthorizationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        authorizationStatus = settings.authorizationStatus
    }

    func requestAuthorizationIfNeeded() async -> Bool {
        await refreshAuthorizationStatus()
        guard authorizationStatus == .notDetermined else {
            return authorizationStatus == .authorized || authorizationStatus == .provisional
        }

        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
            await refreshAuthorizationStatus()
            return granted
        } catch {
            return false
        }
    }

    func schedule(config: ReminderConfig) async {
        guard config.isEnabled, await requestAuthorizationIfNeeded() else { return }
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["daily-evening", "daily-morning"])

        switch config.cadence {
        case .evening, .onceDaily, .anytime:
            scheduleDaily(id: "daily-evening", hour: config.eveningHour, minute: config.eveningMinute, title: "A small bright thing", body: "Add a photo and a few nice moments from today.")
        case .morningEvening:
            scheduleDaily(id: "daily-morning", hour: config.morningHour, minute: config.morningMinute, title: "Set a gentle note", body: "What would make today feel good?")
            scheduleDaily(id: "daily-evening", hour: config.eveningHour, minute: config.eveningMinute, title: "Capture today", body: "Add your photo and three nice things.")
        }
    }

    private func scheduleDaily(id: String, hour: Int, minute: Int, title: String, body: String) {
        var components = DateComponents()
        components.hour = hour
        components.minute = minute

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }
}
