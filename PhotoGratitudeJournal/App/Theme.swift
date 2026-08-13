import SwiftUI
import UIKit

enum JournalTheme {
    /// Warm Album spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32.
    enum Spacing {
        static let xSmall: CGFloat = 4
        static let small: CGFloat = 8
        static let medium: CGFloat = 12
        static let large: CGFloat = 16
        static let xLarge: CGFloat = 24
        static let xxLarge: CGFloat = 32
    }

    /// Warm Album radii: control 14, inner card 16, journal card 22, hero/photo 28.
    /// Always used with `RoundedRectangle(cornerRadius:style: .continuous)`.
    enum Radius {
        static let small: CGFloat = 14
        static let medium: CGFloat = 16
        static let large: CGFloat = 22
        static let hero: CGFloat = 28
    }

    enum Layout {
        static let horizontalPadding: CGFloat = 18
        static let sectionSpacing: CGFloat = 20
        static let minimumTapTarget: CGFloat = 44
        static let photoHeroAspectRatio: CGFloat = 0.82
        static let memoryCardAspectRatio: CGFloat = 1.18
    }

    /// Elevation tokens. Shadows are always warm brown (#423023), never black.
    enum Shadow {
        private static let warmBrown = Color(red: 66 / 255, green: 48 / 255, blue: 35 / 255)

        static let cardColor = warmBrown.opacity(0.07)
        static let cardRadius: CGFloat = 13
        static let cardYOffset: CGFloat = 8

        static let journalColor = warmBrown.opacity(0.14)
        static let journalRadius: CGFloat = 27
        static let journalYOffset: CGFloat = 20

        static let photoColor = warmBrown.opacity(0.22)
        static let photoRadius: CGFloat = 19
        static let photoYOffset: CGFloat = 18
    }
}

extension Color {
    /// An adaptive color that resolves to `light` in light mode and `dark` in
    /// dark mode (Warm Album's warm-charcoal scheme).
    init(light: UIColor, dark: UIColor) {
        self.init(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark ? dark : light
        })
    }
}

private extension UIColor {
    convenience init(rgb: UInt32, alpha: CGFloat = 1) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: alpha
        )
    }
}

extension Color {
    static var rose: Color { Color(light: UIColor(rgb: 0xAD3145), dark: UIColor(rgb: 0xE0798C)) }
    static var ink: Color { Color(light: UIColor(rgb: 0x212128), dark: UIColor(rgb: 0xF3EDE4)) }
    static var mist: Color { Color(light: UIColor(rgb: 0xF0F2ED), dark: UIColor(rgb: 0x342E28)) }
    static var leaf: Color { Color(light: UIColor(rgb: 0x367A63), dark: UIColor(rgb: 0x7DBB9E)) }
    static var dawn: Color { Color(light: UIColor(rgb: 0xF5A37A), dark: UIColor(rgb: 0xF5A37A)) }
    static var journalBackground: Color { Color(light: UIColor(rgb: 0xFAF5ED), dark: UIColor(rgb: 0x211D1A)) }
    static var journalSurface: Color { Color(light: UIColor(rgb: 0xFFFDF8), dark: UIColor(rgb: 0x2A2521)) }
    static var journalSurfaceRaised: Color { Color(light: UIColor(rgb: 0xFBF2E8), dark: UIColor(rgb: 0x342E28)) }
    static var warmGray: Color { Color(light: UIColor(rgb: 0x786E63), dark: UIColor(rgb: 0xA89C8D)) }
    static var softInk: Color { Color(light: UIColor(rgb: 0x47454A), dark: UIColor(rgb: 0xD6CEC2)) }
    static var journalLine: Color {
        Color(light: UIColor(rgb: 0x212128, alpha: 0.08), dark: UIColor(rgb: 0xF3EDE4, alpha: 0.10))
    }
    static var photoShadow: Color { JournalTheme.Shadow.photoColor }
}

extension ShapeStyle where Self == Color {
    static var rose: Color { Color.rose }
    static var ink: Color { Color.ink }
    static var mist: Color { Color.mist }
    static var leaf: Color { Color.leaf }
    static var dawn: Color { Color.dawn }
    static var journalBackground: Color { Color.journalBackground }
    static var journalSurface: Color { Color.journalSurface }
    static var journalSurfaceRaised: Color { Color.journalSurfaceRaised }
    static var warmGray: Color { Color.warmGray }
    static var softInk: Color { Color.softInk }
    static var journalLine: Color { Color.journalLine }
}

extension View {
    func journalCard(padding: CGFloat = 16) -> some View {
        self
            .padding(padding)
            .background(Color.journalSurface, in: RoundedRectangle(cornerRadius: JournalTheme.Radius.large, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: JournalTheme.Radius.large, style: .continuous)
                    .stroke(Color.journalLine, lineWidth: 1)
            }
            .compositingGroup()
            .shadow(
                color: JournalTheme.Shadow.cardColor,
                radius: JournalTheme.Shadow.cardRadius,
                x: 0,
                y: JournalTheme.Shadow.cardYOffset
            )
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
                    .stroke(Color.journalLine, lineWidth: 1)
            }
            .compositingGroup()
            .shadow(
                color: JournalTheme.Shadow.cardColor,
                radius: JournalTheme.Shadow.cardRadius,
                x: 0,
                y: JournalTheme.Shadow.cardYOffset
            )
    }

    func journalPhotoShape(cornerRadius: CGFloat = JournalTheme.Radius.hero) -> some View {
        self
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .shadow(
                color: JournalTheme.Shadow.photoColor,
                radius: JournalTheme.Shadow.photoRadius,
                x: 0,
                y: JournalTheme.Shadow.photoYOffset
            )
    }
}
