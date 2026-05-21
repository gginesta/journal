import SwiftUI

extension Color {
    static var rose: Color { Color(red: 0.78, green: 0.27, blue: 0.36) }
    static var ink: Color { Color(red: 0.13, green: 0.13, blue: 0.16) }
    static var mist: Color { Color(red: 0.94, green: 0.95, blue: 0.93) }
    static var leaf: Color { Color(red: 0.21, green: 0.48, blue: 0.39) }
    static var dawn: Color { Color(red: 0.96, green: 0.64, blue: 0.48) }
}

extension View {
    func journalCard(padding: CGFloat = 16) -> some View {
        self
            .padding(padding)
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}
