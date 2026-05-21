import Foundation

enum EntryCompletion {
    static func isComplete(responseTexts: [String], photoCount: Int) -> Bool {
        let hasResponse = responseTexts.contains { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        return hasResponse || photoCount > 0
    }
}
