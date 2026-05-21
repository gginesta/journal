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

                        EntryPeopleSection(entry: entry)
                        EntryLittleDetailsSection(entry: entry)

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

private struct EntryPeopleSection: View {
    let entry: JournalEntry

    private var people: [PersonTag] {
        entry.sortedPersonTags
    }

    var body: some View {
        if !people.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: "People", systemImage: "person.2")
                PeopleChipSummary(people: people)
            }
            .journalCard()
        }
    }
}

private struct EntryLittleDetailsSection: View {
    let entry: JournalEntry

    private var details: [MemoryDetail] {
        entry.sortedDetails.filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    var body: some View {
        if !details.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: "Little Details", systemImage: "sparkles")

                ForEach(details) { detail in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(detail.text)
                            .font(.body)
                            .foregroundStyle(.primary)
                            .fixedSize(horizontal: false, vertical: true)

                        let people = detail.sortedPersonTags
                        if !people.isEmpty {
                            PeopleChipSummary(people: people)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
                }
            }
            .journalCard()
        }
    }
}
