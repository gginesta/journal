import SwiftData
import SwiftUI

struct RootAppView: View {
    @Environment(PrivacyLockService.self) private var privacyLock
    @State private var selectedTab: AppTab = .today
    @State private var todayRouter = RouterPath()
    @State private var timelineRouter = RouterPath()
    @State private var calendarRouter = RouterPath()
    @State private var insightsRouter = RouterPath()
    @State private var settingsRouter = RouterPath()

    var body: some View {
        ZStack {
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

            if privacyLock.isLocked {
                LockedView()
            }
        }
        .task {
            await privacyLock.lockIfNeeded()
        }
    }

    private func router(for tab: AppTab) -> RouterPath {
        switch tab {
        case .today: todayRouter
        case .timeline: timelineRouter
        case .calendar: calendarRouter
        case .insights: insightsRouter
        case .settings: settingsRouter
        }
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
