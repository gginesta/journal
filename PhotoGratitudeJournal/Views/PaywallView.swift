import StoreKit
import SwiftUI

struct PaywallView: View {
    @Environment(EntitlementService.self) private var entitlement
    @State private var isPurchasing = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Image(systemName: "sparkles")
                    .font(.system(size: 48, weight: .semibold))
                    .foregroundStyle(.dawn)

                Text("Yearly Premium")
                    .font(.largeTitle.bold())

                Text("Keep the core journal generous and unlock the deeper habit layer when you want more reflection.")
                    .foregroundStyle(.secondary)

                VStack(alignment: .leading, spacing: 12) {
                    premiumRow("Memory widgets", "See today's prompt, streak, and past photos on the Home Screen.")
                    premiumRow("Expanded nostalgia", "Browse this week from past years and seasonal photo recaps.")
                    premiumRow("Advanced insights", "Mood trends, streak patterns, export, and richer prompt sets.")
                    premiumRow("Privacy polish", "Face ID app lock and Premium themes.")
                }
                .journalCard()

                Button {
                    Task { await purchase() }
                } label: {
                    if isPurchasing {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text(entitlement.hasPremium ? "Premium active" : "Start yearly Premium")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.rose)
                .controlSize(.large)

                Button("Restore Purchases") {
                    Task { await entitlement.restorePurchases() }
                }
                .frame(maxWidth: .infinity)
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Premium")
    }

    private func premiumRow(_ title: String, _ subtitle: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.leaf)
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.headline)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func purchase() async {
        isPurchasing = true
        defer { isPurchasing = false }
        do {
            try await entitlement.purchaseYearly()
        } catch {
            Persistence.log("Purchase premium", error: error)
        }
    }
}
