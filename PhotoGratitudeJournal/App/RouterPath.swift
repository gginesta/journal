import SwiftUI

@MainActor
@Observable
final class RouterPath {
    var path: [Route] = []
    var presentedSheet: SheetDestination?

    var pathBinding: Binding<[Route]> {
        Binding(
            get: { self.path },
            set: { self.path = $0 }
        )
    }

    func navigate(to route: Route) {
        path.append(route)
    }

    func present(_ sheet: SheetDestination) {
        presentedSheet = sheet
    }
}

enum Route: Hashable {
    case entry(UUID)
    case promptEditor
    case paywall
}

enum SheetDestination: Identifiable {
    case photoPreview(PhotoAttachment)
    case paywall

    var id: String {
        switch self {
        case .photoPreview(let attachment): attachment.id.uuidString
        case .paywall: "paywall"
        }
    }
}

extension View {
    func withAppRoutes() -> some View {
        navigationDestination(for: Route.self) { route in
            switch route {
            case .entry(let id):
                EntryDetailView(entryID: id)
            case .promptEditor:
                PromptEditorView()
            case .paywall:
                PaywallView()
            }
        }
    }
}
