import SwiftUI

enum JournalTheme {
    enum Spacing {
        static let xSmall: CGFloat = 6
        static let small: CGFloat = 10
        static let medium: CGFloat = 14
        static let large: CGFloat = 18
        static let xLarge: CGFloat = 24
    }

    enum Radius {
        static let small: CGFloat = 12
        static let medium: CGFloat = 16
        static let large: CGFloat = 22
        static let hero: CGFloat = 28
    }

    enum Layout {
        static let horizontalPadding: CGFloat = 18
        static let sectionSpacing: CGFloat = 18
        static let minimumTapTarget: CGFloat = 44
        static let photoHeroAspectRatio: CGFloat = 0.82
        static let memoryCardAspectRatio: CGFloat = 1.18
    }
}

extension Color {
    static var rose: Color { Color(red: 0.78, green: 0.27, blue: 0.36) }
    static var ink: Color { Color(red: 0.13, green: 0.13, blue: 0.16) }
    static var mist: Color { Color(red: 0.94, green: 0.95, blue: 0.93) }
    static var leaf: Color { Color(red: 0.21, green: 0.48, blue: 0.39) }
    static var dawn: Color { Color(red: 0.96, green: 0.64, blue: 0.48) }
    static var journalBackground: Color { Color(red: 0.98, green: 0.96, blue: 0.93) }
    static var journalSurface: Color { Color(red: 1.0, green: 0.99, blue: 0.97) }
    static var journalSurfaceRaised: Color { Color(red: 0.98, green: 0.95, blue: 0.91) }
    static var warmGray: Color { Color(red: 0.47, green: 0.43, blue: 0.39) }
    static var softInk: Color { Color(red: 0.28, green: 0.27, blue: 0.29) }
    static var photoShadow: Color { Color(red: 0.26, green: 0.20, blue: 0.16).opacity(0.14) }
}

extension View {
    func journalCard(padding: CGFloat = 16) -> some View {
        self
            .padding(padding)
            .background(Color.journalSurface, in: RoundedRectangle(cornerRadius: JournalTheme.Radius.large, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: JournalTheme.Radius.large, style: .continuous)
                    .stroke(Color.ink.opacity(0.06), lineWidth: 1)
            }
    }

    func journalSurface(
        padding: CGFloat = JournalTheme.Spacing.large,
        cornerRadius: CGFloat = JournalTheme.Radius.large
    ) -> some View {
        self
            .padding(padding)
            .background(Color.journalSurface, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.ink.opacity(0.06), lineWidth: 1)
            }
    }

    func journalPhotoShape(cornerRadius: CGFloat = JournalTheme.Radius.hero) -> some View {
        self
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .shadow(color: .photoShadow, radius: 18, x: 0, y: 10)
    }
}
