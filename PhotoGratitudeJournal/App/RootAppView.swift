import Combine
import SwiftData
import SwiftUI

struct RootAppView: View {
    @Environment(PrivacyLockService.self) private var privacyLock
    @AppStorage("hasCompletedFirstLaunchOnboarding") private var hasCompletedFirstLaunchOnboarding = false
    @State private var showingSaveFailureAlert = false
    @State private var selectedTab: AppTab = .today
    @State private var todayRouter = RouterPath()
    @State private var memoriesRouter = RouterPath()
    @State private var calendarRouter = RouterPath()
    @State private var insightsRouter = RouterPath()
    @State private var settingsRouter = RouterPath()

    var body: some View {
        ZStack {
            if hasCompletedFirstLaunchOnboarding {
                TabView(selection: $selectedTab) {
                    ForEach(AppTab.allCases) { tab in
                        NavigationStack(path: router(for: tab).pathBinding) {
                            tab.content
                                .withAppRoutes()
                        }
                        .environment(router(for: tab))
                        .tabItem { tab.label }
                        .tag(tab)
                    }
                }
                .tint(.rose)
                .disabled(privacyLock.isLocked)
                .blur(radius: privacyLock.isLocked ? 12 : 0)
            } else {
                FirstLaunchOnboardingView {
                    hasCompletedFirstLaunchOnboarding = true
                }
            }

            if hasCompletedFirstLaunchOnboarding, privacyLock.isLocked {
                LockedView()
            }
        }
        .task {
            if hasCompletedFirstLaunchOnboarding {
                await privacyLock.lockIfNeeded()
            }
        }
        .onChange(of: hasCompletedFirstLaunchOnboarding) { _, isCompleted in
            guard isCompleted else { return }
            Task { await privacyLock.lockIfNeeded() }
        }
        .onReceive(NotificationCenter.default.publisher(for: Persistence.saveFailedNotification)) { _ in
            showingSaveFailureAlert = true
        }
        .alert("That change may not have saved", isPresented: $showingSaveFailureAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Something went wrong while saving. It is safe to try again — if this keeps happening, please send beta feedback from Settings.")
        }
    }

    private func router(for tab: AppTab) -> RouterPath {
        switch tab {
        case .today: todayRouter
        case .memories: memoriesRouter
        case .calendar: calendarRouter
        case .insights: insightsRouter
        case .settings: settingsRouter
        }
    }
}

private struct FirstLaunchOnboardingView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(ReminderScheduler.self) private var reminderScheduler
    @Query private var reminderConfigs: [ReminderConfig]
    @State private var selectedCadence: RitualCadence = .evening
    @State private var wantsReminders = false

    let onComplete: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button("Skip") {
                    Task { await finish(wantsReminders: false) }
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.warmGray)
                .buttonStyle(.plain)
                .padding(.horizontal, JournalTheme.Layout.horizontalPadding)
                .padding(.top, JournalTheme.Spacing.large)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: JournalTheme.Spacing.large) {
                    VStack(alignment: .leading, spacing: JournalTheme.Spacing.small) {
                        Image(systemName: "camera.macro")
                            .font(.system(size: 42, weight: .semibold))
                            .foregroundStyle(.rose)
                            .frame(width: 68, height: 68)
                            .background(Color.rose.opacity(0.12), in: Circle())
                            .accessibilityHidden(true)

                        Text("Notice the good stuff")
                            .font(.largeTitle.weight(.bold))
                            .foregroundStyle(.ink)
                            .fixedSize(horizontal: false, vertical: true)

                        Text("Photo Gratitude Journal keeps a tiny, private record of the ordinary moments worth remembering.")
                            .font(.body)
                            .foregroundStyle(.warmGray)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.top, JournalTheme.Spacing.large)

                    valueSection
                    cadenceSection
                    reminderSection
                    privacySection

                    Button {
                        Task { await finish(wantsReminders: wantsReminders) }
                    } label: {
                        Label("Start journaling", systemImage: "arrow.right.circle.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity, minHeight: JournalTheme.Layout.minimumTapTarget)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.rose)
                    .controlSize(.large)
                    .padding(.top, JournalTheme.Spacing.small)
                }
                .padding(.horizontal, JournalTheme.Layout.horizontalPadding)
                .padding(.bottom, JournalTheme.Spacing.xLarge)
            }
        }
        .background(Color.journalBackground.ignoresSafeArea())
        .task {
            if let config = reminderConfigs.first {
                selectedCadence = config.cadence
            }
        }
    }

    private var valueSection: some View {
        VStack(alignment: .leading, spacing: JournalTheme.Spacing.medium) {
            OnboardingFeatureRow(
                systemImage: "photo.on.rectangle.angled",
                title: "Lead with one photo",
                message: "Start from the thing you saw, not a blank page."
            )
            OnboardingFeatureRow(
                systemImage: "text.bubble",
                title: "Write three nice things",
                message: "Short answers are enough; little details can carry the memory."
            )
            OnboardingFeatureRow(
                systemImage: "person.2",
                title: "Keep people tags private",
                message: "Names help you find memories later without leaving your journal."
            )
        }
        .journalSurface()
    }

    private var cadenceSection: some View {
        VStack(alignment: .leading, spacing: JournalTheme.Spacing.medium) {
            Text("Choose a rhythm")
                .font(.headline)
                .foregroundStyle(.ink)

            ForEach([RitualCadence.evening, .onceDaily, .morningEvening, .anytime]) { cadence in
                OnboardingChoiceRow(
                    title: cadence.title,
                    message: cadenceDescription(for: cadence),
                    systemImage: cadenceIcon(for: cadence),
                    isSelected: selectedCadence == cadence
                ) {
                    selectedCadence = cadence
                }
            }
        }
        .journalSurface()
    }

    private var reminderSection: some View {
        VStack(alignment: .leading, spacing: JournalTheme.Spacing.medium) {
            Toggle(isOn: $wantsReminders) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Ask for a local reminder")
                        .font(.headline)
                        .foregroundStyle(.ink)
                    Text("You can start without notifications. If this is on, iOS will ask permission after you tap Start.")
                        .font(.subheadline)
                        .foregroundStyle(.warmGray)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .toggleStyle(.switch)
            .tint(.rose)
        }
        .journalSurface()
    }

    private var privacySection: some View {
        VStack(alignment: .leading, spacing: JournalTheme.Spacing.medium) {
            OnboardingFeatureRow(
                systemImage: "lock.shield",
                title: "Private by default",
                message: "Entries live in your app data. App lock is available in Settings for beta testing."
            )
            OnboardingFeatureRow(
                systemImage: "icloud",
                title: "Built for iCloud sync",
                message: "The beta is local-first and ready for the app's private CloudKit container before shipping."
            )
        }
        .journalSurface()
    }

    @MainActor
    private func finish(wantsReminders: Bool) async {
        let config = reminderConfigs.first ?? ReminderConfig(isEnabled: false)
        if reminderConfigs.first == nil {
            modelContext.insert(config)
        }

        config.cadence = selectedCadence
        config.isEnabled = wantsReminders
        Persistence.save(modelContext, operation: "Save onboarding choices")

        await reminderScheduler.schedule(config: config)
        onComplete()
    }

    private func cadenceDescription(for cadence: RitualCadence) -> String {
        switch cadence {
        case .evening:
            "A gentle nightly check-in for today's photo and three nice things."
        case .onceDaily:
            "One flexible daily moment when you have a quiet minute."
        case .morningEvening:
            "A morning note and an evening memory for a fuller ritual."
        case .anytime:
            "No fixed ritual; open the journal whenever something lands."
        }
    }

    private func cadenceIcon(for cadence: RitualCadence) -> String {
        switch cadence {
        case .evening:
            "moon.stars"
        case .onceDaily:
            "sun.min"
        case .morningEvening:
            "sunrise"
        case .anytime:
            "sparkles"
        }
    }
}

private struct OnboardingFeatureRow: View {
    let systemImage: String
    let title: String
    let message: String

    var body: some View {
        HStack(alignment: .top, spacing: JournalTheme.Spacing.medium) {
            Image(systemName: systemImage)
                .font(.title3.weight(.semibold))
                .foregroundStyle(.rose)
                .frame(width: JournalTheme.Layout.minimumTapTarget, height: JournalTheme.Layout.minimumTapTarget)
                .background(Color.rose.opacity(0.1), in: Circle())
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.ink)
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.warmGray)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

private struct OnboardingChoiceRow: View {
    let title: String
    let message: String
    let systemImage: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: JournalTheme.Spacing.medium) {
                Image(systemName: systemImage)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(isSelected ? Color.rose : Color.warmGray)
                    .frame(width: JournalTheme.Layout.minimumTapTarget, height: JournalTheme.Layout.minimumTapTarget)
                    .background((isSelected ? Color.rose : Color.warmGray).opacity(0.1), in: Circle())
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.ink)
                    Text(message)
                        .font(.subheadline)
                        .foregroundStyle(.warmGray)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 0)

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(isSelected ? Color.rose : Color.warmGray.opacity(0.55))
                    .accessibilityHidden(true)
            }
            .padding(JournalTheme.Spacing.medium)
            .background(Color.journalSurfaceRaised.opacity(isSelected ? 1 : 0.55), in: RoundedRectangle(cornerRadius: JournalTheme.Radius.medium, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: JournalTheme.Radius.medium, style: .continuous)
                    .stroke(isSelected ? Color.rose.opacity(0.35) : Color.ink.opacity(0.06), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(title). \(message)")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

private struct LockedView: View {
    @Environment(PrivacyLockService.self) private var privacyLock

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "lock.fill")
                .font(.system(size: 42, weight: .semibold))
                .foregroundStyle(.rose)

            Text("Journal Locked")
                .font(.title2.bold())

            Button {
                Task { await privacyLock.unlock() }
            } label: {
                Label("Unlock", systemImage: "faceid")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.rose)
            .controlSize(.large)
            .padding(.top, 8)
        }
        .padding(28)
        .frame(maxWidth: 320)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding()
    }
}
