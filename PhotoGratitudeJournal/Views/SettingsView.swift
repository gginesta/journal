import SwiftData
import SwiftUI
import UserNotifications

struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(RouterPath.self) private var router
    @Environment(ReminderScheduler.self) private var reminderScheduler
    @Environment(PrivacyLockService.self) private var privacyLock
    @Environment(EntitlementService.self) private var entitlement
    @Environment(PhotoStore.self) private var photoStore
    @Query private var reminderConfigs: [ReminderConfig]
    @Query(sort: \JournalEntry.day, order: .reverse) private var entries: [JournalEntry]
    @State private var exportURL: URL?
    @State private var showingDeleteConfirmation = false
    @AppStorage(ExperienceMode.storageKey) private var experienceModeRawValue = ExperienceMode.defaultMode.rawValue

    var body: some View {
        Form {
            // SPEC-7: the Simple/Full toggle. Presentation-only — switching
            // never deletes anything.
            Section("Experience") {
                ForEach(ExperienceMode.allCases) { mode in
                    Button {
                        experienceModeRawValue = mode.rawValue
                    } label: {
                        HStack(alignment: .top, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(mode.title)
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(.ink)
                                Text(mode.summary)
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }

                            Spacer(minLength: 0)

                            if experienceMode == mode {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.rose)
                                    .accessibilityHidden(true)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(mode.title) experience")
                    .accessibilityAddTraits(experienceMode == mode ? .isSelected : [])
                }

                Text("Switching never deletes anything; what you added in Full stays saved and comes right back.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Ritual") {
                if let config = reminderConfigs.first {
                    Picker("Cadence", selection: cadenceBinding(for: config)) {
                        ForEach(RitualCadence.allCases) { cadence in
                            Text(cadence.title).tag(cadence)
                        }
                    }
                    Text(cadenceDescription(for: config.cadence))
                        .font(.footnote)
                        .foregroundStyle(.secondary)

                    Toggle("Daily reminders", isOn: reminderBinding(for: config))

                    if config.isEnabled {
                        DatePicker(
                            primaryReminderLabel(for: config.cadence),
                            selection: eveningTimeBinding(for: config),
                            displayedComponents: .hourAndMinute
                        )

                        if config.cadence == .morningEvening {
                            DatePicker(
                                "Morning reminder",
                                selection: morningTimeBinding(for: config),
                                displayedComponents: .hourAndMinute
                            )
                        }

                        Label(reminderPermissionText, systemImage: reminderPermissionIcon)
                            .font(.footnote)
                            .foregroundStyle(reminderPermissionColor)

                        if reminderScheduler.authorizationStatus == .denied {
                            Text("Notifications are off for this app in iOS Settings. Your cadence is saved here, but reminders cannot fire until permission is enabled.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        Text("Reminders are optional. Your cadence still shapes the journal prompts without scheduling notifications.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                } else {
                    Label("Setting up reminder controls", systemImage: "bell")
                        .foregroundStyle(.secondary)
                }
            }

            // SPEC-7: the prompt editor is a Full customization surface.
            if ExperienceModeMap.isVisible(.promptEditor, in: experienceMode) {
                Section("Prompts") {
                    NavigationLink(value: Route.promptEditor) {
                        Label("Edit daily prompts", systemImage: "list.bullet.rectangle")
                    }
                }
            }

            Section("Privacy") {
                Toggle("App lock", isOn: privacyLockBinding)
                Text("App lock is free during the beta so the privacy flow can be tested early.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            // Hidden for the TestFlight beta: nothing is gated and the paywall
            // shows no price (see EntitlementService.showPremiumUI).
            if EntitlementService.showPremiumUI {
                Section("Premium") {
                    Button {
                        router.navigate(to: .paywall)
                    } label: {
                        Label(entitlement.hasPremium ? "Premium active" : "Yearly Premium", systemImage: "sparkles")
                    }
                }
            }

            Section("iCloud") {
                Label("Private iCloud sync ready", systemImage: "icloud")
                Text("Enable the CloudKit container in Signing & Capabilities before shipping.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Beta") {
                Label(appVersionText, systemImage: "app.badge")

                Link(destination: feedbackURL) {
                    Label("Send beta feedback", systemImage: "envelope")
                }

                Text("Please include what you tried, what felt confusing, and whether any memory, tag, detail, or photo did not persist after relaunch.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Data") {
                Button {
                    do {
                        exportURL = try ExportService.export(entries: entries)
                    } catch {
                        exportURL = nil
                        Persistence.report("Export journal", error: error)
                    }
                } label: {
                    Label("Prepare JSON export", systemImage: "square.and.arrow.up")
                }

                if let exportURL {
                    ShareLink(item: exportURL) {
                        Label("Share export", systemImage: "doc.text")
                    }
                }

                Button(role: .destructive) {
                    showingDeleteConfirmation = true
                } label: {
                    Label("Delete all entries", systemImage: "trash")
                }
            }
        }
        .navigationTitle("Settings")
        .confirmationDialog("Delete all journal entries?", isPresented: $showingDeleteConfirmation, titleVisibility: .visible) {
            Button("Delete entries", role: .destructive) {
                deleteEntries()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Prompts and settings will stay, but entries and attached records will be removed from the local SwiftData store and synced deletion will propagate through iCloud.")
        }
        .task {
            ensureReminderConfig()
            await reminderScheduler.refreshAuthorizationStatus()
        }
    }

    private var experienceMode: ExperienceMode {
        ExperienceMode.fromStoredValue(experienceModeRawValue)
    }

    private func cadenceBinding(for config: ReminderConfig) -> Binding<RitualCadence> {
        Binding(
            get: { config.cadence },
            set: { newValue in
                config.cadence = newValue
                saveAndReschedule(config)
            }
        )
    }

    private func reminderBinding(for config: ReminderConfig) -> Binding<Bool> {
        Binding(
            get: { config.isEnabled },
            set: { newValue in
                config.isEnabled = newValue
                saveAndReschedule(config)
            }
        )
    }

    private func eveningTimeBinding(for config: ReminderConfig) -> Binding<Date> {
        Binding(
            get: { date(hour: config.eveningHour, minute: config.eveningMinute) },
            set: { newValue in
                let components = Calendar.current.dateComponents([.hour, .minute], from: newValue)
                config.eveningHour = components.hour ?? config.eveningHour
                config.eveningMinute = components.minute ?? config.eveningMinute
                saveAndReschedule(config)
            }
        )
    }

    private func morningTimeBinding(for config: ReminderConfig) -> Binding<Date> {
        Binding(
            get: { date(hour: config.morningHour, minute: config.morningMinute) },
            set: { newValue in
                let components = Calendar.current.dateComponents([.hour, .minute], from: newValue)
                config.morningHour = components.hour ?? config.morningHour
                config.morningMinute = components.minute ?? config.morningMinute
                saveAndReschedule(config)
            }
        )
    }

    private var privacyLockBinding: Binding<Bool> {
        Binding(
            get: { privacyLock.isEnabled },
            set: { privacyLock.isEnabled = $0 }
        )
    }

    private var appVersionText: String {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.1.0"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
        return "Beta \(version) (\(build))"
    }

    private var feedbackURL: URL {
        URL(string: "mailto:?subject=Photo%20Journal%20Beta%20Feedback")!
    }

    private var reminderPermissionText: String {
        switch reminderScheduler.authorizationStatus {
        case .notDetermined:
            "Notification permission has not been requested yet."
        case .denied:
            "Notification permission is off."
        case .authorized:
            "Notification permission is on."
        case .provisional:
            "Quiet notifications are allowed."
        case .ephemeral:
            "Temporary notifications are allowed."
        @unknown default:
            "Notification permission status is unknown."
        }
    }

    private var reminderPermissionIcon: String {
        switch reminderScheduler.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            "checkmark.circle"
        case .denied:
            "exclamationmark.triangle"
        case .notDetermined:
            "questionmark.circle"
        @unknown default:
            "questionmark.circle"
        }
    }

    private var reminderPermissionColor: Color {
        switch reminderScheduler.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            .leaf
        case .denied:
            .dawn
        case .notDetermined:
            .secondary
        @unknown default:
            .secondary
        }
    }

    private func deleteEntries() {
        for entry in entries {
            for photo in entry.sortedPhotos {
                photoStore.deleteFiles(for: photo)
            }
            modelContext.delete(entry)
        }
        Persistence.save(modelContext, operation: "Delete entries")
    }

    private func ensureReminderConfig() {
        guard reminderConfigs.isEmpty else { return }
        modelContext.insert(ReminderConfig(isEnabled: false))
        Persistence.save(modelContext, operation: "Create reminder config")
    }

    private func saveAndReschedule(_ config: ReminderConfig) {
        Persistence.save(modelContext, operation: "Update reminders")
        Task { await reminderScheduler.schedule(config: config) }
    }

    private func primaryReminderLabel(for cadence: RitualCadence) -> String {
        switch cadence {
        case .morningEvening:
            "Evening reminder"
        case .evening:
            "Evening reminder"
        case .onceDaily, .anytime:
            "Reminder time"
        }
    }

    private func cadenceDescription(for cadence: RitualCadence) -> String {
        switch cadence {
        case .evening:
            "One evening prompt to capture today's photo and nice things."
        case .onceDaily:
            "One flexible daily session."
        case .morningEvening:
            "A morning note and an evening journal session."
        case .anytime:
            "A loose rhythm for journaling whenever something is worth saving."
        }
    }

    private func date(hour: Int, minute: Int) -> Date {
        Calendar.current.date(
            from: DateComponents(
                calendar: Calendar.current,
                hour: hour,
                minute: minute
            )
        ) ?? .now
    }
}
