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
                        EntrySummaryCard(entry: entry)

                        if !entry.sortedPhotos.isEmpty {
                            EntryPhotoGrid(photos: entry.sortedPhotos)
                        }

                        EntryWrittenResponsesSection(entry: entry)
                        EntryPeopleSection(entry: entry)
                        EntryLittleDetailsSection(entry: entry)

                        if !entry.hasSavedContent {
                            EmptyStateView(
                                title: "Nothing saved here yet",
                                message: "Add a photo, a few words, a person, or a Little Detail from Today and this entry will become easier to revisit.",
                                systemImage: "text.badge.plus"
                            )
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

private struct EntrySummaryCard: View {
    let entry: JournalEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(entry.day.formatted(date: .complete, time: .omitted))
                        .font(.title3.bold())
                        .foregroundStyle(.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Label(entry.mood.title, systemImage: entry.mood.symbol)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 8)

                Label(entry.isComplete ? "Saved" : "In progress", systemImage: entry.isComplete ? "checkmark.circle.fill" : "circle.dotted")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(entry.isComplete ? Color.leaf : Color.secondary)
                    .padding(.horizontal, 10)
                    .frame(minHeight: 32)
                    .background((entry.isComplete ? Color.leaf : Color.secondary).opacity(0.12), in: Capsule())
            }

            FlowSummary(stats: summaryStats)
        }
        .journalCard()
    }

    private var summaryStats: [EntrySummaryStat] {
        [
            EntrySummaryStat(label: photoLabel, systemImage: "photo"),
            EntrySummaryStat(label: writingLabel, systemImage: "text.alignleft"),
            EntrySummaryStat(label: detailLabel, systemImage: "sparkles"),
            EntrySummaryStat(label: peopleLabel, systemImage: "person.2")
        ]
    }

    private var photoLabel: String {
        let count = entry.sortedPhotos.count
        return count == 1 ? "1 photo" : "\(count) photos"
    }

    private var writingLabel: String {
        let count = entry.savedResponses.count
        return count == 1 ? "1 response" : "\(count) responses"
    }

    private var detailLabel: String {
        let count = entry.savedDetails.count
        return count == 1 ? "1 detail" : "\(count) details"
    }

    private var peopleLabel: String {
        let count = entry.uniquePeopleCount
        return count == 1 ? "1 person" : "\(count) people"
    }
}

private struct FlowSummary: View {
    let stats: [EntrySummaryStat]

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 118), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(stats) { stat in
                Label(stat.label, systemImage: stat.systemImage)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .padding(.horizontal, 10)
                    .frame(maxWidth: .infinity, minHeight: 34, alignment: .leading)
                    .background(Color(.tertiarySystemBackground), in: Capsule())
            }
        }
    }
}

private struct EntrySummaryStat: Identifiable {
    let label: String
    let systemImage: String

    var id: String { "\(systemImage)-\(label)" }
}

private struct EntryWrittenResponsesSection: View {
    let entry: JournalEntry

    var body: some View {
        if !entry.savedResponsesBySession.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: "Written Gratitude", systemImage: "text.alignleft")

                ForEach(entry.savedResponsesBySession) { group in
                    VStack(alignment: .leading, spacing: 10) {
                        if entry.savedResponsesBySession.count > 1 {
                            Label(group.title, systemImage: group.systemImage)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.secondary)
                        }

                        ForEach(group.responses) { response in
                            EntryResponseCard(response: response)
                        }
                    }
                }
            }
            .journalCard()
        }
    }
}

private struct EntryResponseCard: View {
    let response: PromptResponse

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(response.promptText)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            Text(response.text.trimmingCharacters(in: .whitespacesAndNewlines))
                .font(.body)
                .foregroundStyle(.primary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct EntryPeopleSection: View {
    let entry: JournalEntry

    private var people: [PersonTag] {
        entry.uniquePeople
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
        entry.savedDetails
    }

    var body: some View {
        if !details.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: "Little Details", systemImage: "sparkles")

                ForEach(details) { detail in
                    VStack(alignment: .leading, spacing: 8) {
                        Label(detail.detailCategory.title, systemImage: "tag")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)

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

private struct EntryResponseGroup: Identifiable {
    let sessionID: UUID
    let title: String
    let systemImage: String
    let responses: [PromptResponse]

    var id: UUID { sessionID }
}

private extension JournalEntry {
    var savedResponses: [PromptResponse] {
        sortedSessions
            .flatMap(\.sortedResponses)
            .filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    var savedResponsesBySession: [EntryResponseGroup] {
        sortedSessions.compactMap { session in
            let responses = session.sortedResponses.filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            guard !responses.isEmpty else { return nil }

            return EntryResponseGroup(
                sessionID: session.id,
                title: session.kind.title,
                systemImage: session.kind.icon,
                responses: responses
            )
        }
    }

    var savedDetails: [MemoryDetail] {
        sortedDetails.filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    var uniquePeople: [PersonTag] {
        var seenIDs = Set<UUID>()
        let candidates = sortedPersonTags + savedDetails.flatMap(\.sortedPersonTags)

        return candidates.filter { person in
            if seenIDs.contains(person.id) {
                return false
            }
            seenIDs.insert(person.id)
            return true
        }
    }

    var uniquePeopleCount: Int {
        uniquePeople.count
    }

    var hasSavedContent: Bool {
        !sortedPhotos.isEmpty ||
        !savedResponses.isEmpty ||
        !savedDetails.isEmpty ||
        !uniquePeople.isEmpty
    }
}
