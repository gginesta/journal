import Foundation
import StoreKit

@MainActor
@Observable
final class EntitlementService {
    static let yearlyProductID = "photo.gratitude.journal.premium.yearly"

    var state: EntitlementState = .loading
    var products: [Product] = []

    var hasPremium: Bool { state.hasPremium }

    func refresh() async {
        await loadProducts()
        var premiumExpiration: Date?

        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            if transaction.productID == Self.yearlyProductID {
                premiumExpiration = transaction.expirationDate
            }
        }

        if let premiumExpiration {
            state = .premium(expiresAt: premiumExpiration)
        } else {
            state = .free
        }
    }

    func purchaseYearly() async throws {
        guard let yearly = products.first(where: { $0.id == Self.yearlyProductID }) else { return }
        let result = try await yearly.purchase()
        if case .success(let verification) = result,
           case .verified(let transaction) = verification {
            await transaction.finish()
        }
        await refresh()
    }

    func restorePurchases() async {
        do {
            try await AppStore.sync()
        } catch {
            Persistence.log("Restore purchases", error: error)
        }
        await refresh()
    }

    private func loadProducts() async {
        do {
            products = try await Product.products(for: [Self.yearlyProductID])
        } catch {
            Persistence.log("Load products", error: error)
            products = []
        }
    }
}
