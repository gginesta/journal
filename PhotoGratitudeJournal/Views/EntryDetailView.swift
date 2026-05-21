import SwiftData
import SwiftUI

struct EntryDetailView: View {
    @Query private var entries: [JournalEntry]
    let entryID: UUID

    init(entryID: UUID) {
        self.entryID = entryID
        _entries = Query(filter: #Predicate<JournalEntry> { $0.id == entryID })
    }

    var body: some View {
        Group {
            if let entry = entries.first {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if !entry.sortedPhotos.isEmpty {
                            EntryPhotoGrid(photos: entry.sortedPhotos)
                        }

                        ForEach(entry.sortedSessions) { session in
                            VStack(alignment: .leading, spacing: 12) {
                                SectionHeader(title: session.kind.title, systemImage: session.kind.icon)
                                ForEach(session.sortedResponses) { response in
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text(response.promptText)
                                            .font(.headline)
                                        Text(response.text.isEmpty ? "No response" : response.text)
                                            .foregroundStyle(response.text.isEmpty ? .secondary : .primary)
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(12)
                                    .background(Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
                                }
                            }
                            .journalCard()
                        }
                    }
                    .padding()
                }
                .background(Color(.systemGroupedBackground))
                .navigationTitle(entry.day.formatted(date: .abbreviated, time: .omitted))
            } else {
                ContentUnavailableView("Entry not found", systemImage: "book.closed")
            }
        }
    }
}
