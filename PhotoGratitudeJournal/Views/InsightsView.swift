import SwiftData
import SwiftUI

struct InsightsView: View {
    @Environment(EntitlementService.self) private var entitlement
    @Environment(RouterPath.self) private var router
    @Query(sort: \JournalEntry.day, order: .reverse) private var entries: [JournalEntry]

    var body: some View {
        let summary = StreakCalculator.summary(entries: entries)

        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 12) {
                    InsightMetric(title: "Current", value: "\(summary.current)", subtitle: "day streak", systemImage: "flame.fill")
                    InsightMetric(title: "Longest", value: "\(summary.longest)", subtitle: "best streak", systemImage: "trophy.fill")
                }

                InsightMetric(title: "Completed", value: "\(summary.completedDays)", subtitle: "journal days", systemImage: "checkmark.circle.fill")

                // Hidden for the TestFlight beta: nothing is gated and the
                // paywall shows no price (see EntitlementService.showPremiumUI).
                if EntitlementService.showPremiumUI {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            SectionHeader(title: "Deeper reflections", systemImage: "sparkles")
                            PremiumBadge()
                        }
                        Text("Premium unlocks mood trends, seasonal memory browsing, export, widgets, themes, and look-back notifications.")
                            .foregroundStyle(.secondary)
                        Button {
                            router.navigate(to: .paywall)
                        } label: {
                            Label(entitlement.hasPremium ? "Premium active" : "See Premium", systemImage: "sparkles")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.rose)
                    }
                    .journalCard()
                }
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Insights")
    }
}

private struct InsightMetric: View {
    let title: String
    let value: String
    let subtitle: String
    let systemImage: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: systemImage)
                .font(.title2)
                .foregroundStyle(.rose)
            Text(title)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.largeTitle.bold())
            Text(subtitle)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .journalCard()
    }
}
