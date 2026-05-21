import SwiftData
import SwiftUI

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

    var body: some View {
        Form {
            Section("Ritual") {
                if let config = reminderConfigs.first {
                    Picker("Cadence", selection: cadenceBinding(for: config)) {
                        ForEach(RitualCadence.allCases) { cadence in
                            Text(cadence.title).tag(cadence)
                        }
                    }

                    Toggle("Daily reminders", isOn: reminderBinding(for: config))
                }
            }

            Section("Prompts") {
                NavigationLink(value: Route.promptEditor) {
                    Label("Edit daily prompts", systemImage: "list.bullet.rectangle")
                }
            }

            Section("Privacy") {
                Toggle("App lock", isOn: privacyLockBinding)
                Text("App lock is a Premium feature in the final product. The switch is wired here so the privacy flow can be tested early.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Premium") {
                Button {
                    router.navigate(to: .paywall)
                } label: {
                    Label(entitlement.hasPremium ? "Premium active" : "Yearly Premium", systemImage: "sparkles")
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
                    exportURL = try? ExportService.export(entries: entries)
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
    }

    private func cadenceBinding(for config: ReminderConfig) -> Binding<RitualCadence> {
        Binding(
            get: { config.cadence },
            set: { newValue in
                config.cadence = newValue
                Task { await reminderScheduler.schedule(config: config) }
            }
        )
    }

    private func reminderBinding(for config: ReminderConfig) -> Binding<Bool> {
        Binding(
            get: { config.isEnabled },
            set: { newValue in
                config.isEnabled = newValue
                Task { await reminderScheduler.schedule(config: config) }
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

    private func deleteEntries() {
        for entry in entries {
            for photo in entry.sortedPhotos {
                photoStore.deleteFiles(for: photo)
            }
            modelContext.delete(entry)
        }
        try? modelContext.save()
    }
}
