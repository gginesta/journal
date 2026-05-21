import SwiftData
import SwiftUI

struct MemoriesView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(RouterPath.self) private var router
    @Query(sort: \JournalEntry.day, order: .reverse) private var entries: [JournalEntry]
    @Query(sort: \PersonTag.sortOrder) private var personTags: [PersonTag]
    @State private var selectedPersonID: UUID?

    private var photoEntries: [JournalEntry] {
        filteredEntries.filter { !$0.sortedPhotos.isEmpty }
    }

    private var writtenEntries: [JournalEntry] {
        filteredEntries.filter { $0.sortedPhotos.isEmpty }
    }

    private var filteredEntries: [JournalEntry] {
        entries.filter { entryMatches($0, personID: selectedPersonID) }
    }

    private var people: [PersonTag] {
        personTags.sorted { lhs, rhs in
            if lhs.sortOrder == rhs.sortOrder {
                return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
            }
            return lhs.sortOrder < rhs.sortOrder
        }
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                if entries.isEmpty {
                    EmptyStateView(
                        title: "Your memories will gather here",
                        message: "Add today's first photo and this becomes a quiet album of good moments.",
                        systemImage: "photo.on.rectangle"
                    )
                    .padding()
                } else {
                    PersonFilterBar(
                        people: people,
                        selectedPersonID: $selectedPersonID,
                        resultCount: filteredEntries.count
                    )
                    .padding(.horizontal)

                    if filteredEntries.isEmpty {
                        EmptyStateView(
                            title: "No memories for this person yet",
                            message: "Tag a person on Today or in a Little Detail, then their memories will collect here.",
                            systemImage: "person.crop.circle.badge.questionmark"
                        )
                        .padding(.horizontal)
                    }

                    if !photoEntries.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Photo Memories")
                                .font(.headline)
                                .padding(.horizontal)
                                .accessibilityAddTraits(.isHeader)

                            ForEach(photoEntries) { entry in
                                Button {
                                    router.navigate(to: .entry(entry.id))
                                } label: {
                                    MemoryPhotoCard(entry: entry)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(memoryAccessibilityLabel(for: entry))
                            }
                        }
                    }

                    if !writtenEntries.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(photoEntries.isEmpty ? "Memories" : "Written Moments")
                                .font(.headline)
                                .padding(.horizontal)
                                .accessibilityAddTraits(.isHeader)

                            ForEach(writtenEntries) { entry in
                                Button {
                                    router.navigate(to: .entry(entry.id))
                                } label: {
                                    WrittenMemoryCard(entry: entry)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(memoryAccessibilityLabel(for: entry))
                            }
                        }
                    }
                }
            }
            .padding(.vertical)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Memories")
        .task {
            JournalStore.seedDefaultPersonTagsIfNeeded(in: modelContext)
        }
    }

    private func memoryAccessibilityLabel(for entry: JournalEntry) -> String {
        let date = entry.day.formatted(date: .long, time: .omitted)
        let photoCount = entry.sortedPhotos.count
        let completion = entry.isComplete ? "complete" : "not complete"
        let people = entry.sortedPersonTags.map(\.name).joined(separator: ", ")
        let peopleText = people.isEmpty ? "" : ", tagged \(people)"

        if photoCount > 0 {
            let photoLabel = photoCount == 1 ? "1 photo" : "\(photoCount) photos"
            return "\(date), \(photoLabel), \(entry.mood.title), \(completion)\(peopleText)"
        } else {
            return "\(date), written memory, \(entry.mood.title), \(completion)\(peopleText)"
        }
    }

    private func entryMatches(_ entry: JournalEntry, personID: UUID?) -> Bool {
        guard let personID else { return true }

        if entry.sortedPersonTags.contains(where: { $0.id == personID }) {
            return true
        }

        return entry.sortedDetails.contains { detail in
            !detail.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
            detail.sortedPersonTags.contains(where: { $0.id == personID })
        }
    }
}

private struct PersonFilterBar: View {
    let people: [PersonTag]
    @Binding var selectedPersonID: UUID?
    let resultCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label("Filter by person", systemImage: "line.3.horizontal.decrease.circle")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Text(resultSummary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            ScrollView(.horizontal) {
                HStack(spacing: 8) {
                    filterButton(title: "All", id: nil)

                    ForEach(people) { person in
                        filterButton(title: person.name, id: person.id)
                    }
                }
                .padding(.vertical, 1)
            }
            .scrollIndicators(.hidden)
        }
        .journalCard(padding: 14)
    }

    private var resultSummary: String {
        resultCount == 1 ? "1 memory" : "\(resultCount) memories"
    }

    private func filterButton(title: String, id: UUID?) -> some View {
        Button {
            selectedPersonID = id
        } label: {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .lineLimit(1)
                .padding(.horizontal, 12)
                .frame(minHeight: 40)
                .background(isSelected(id) ? Color.rose.opacity(0.12) : Color(.tertiarySystemBackground), in: Capsule())
        }
        .buttonStyle(.plain)
        .foregroundStyle(isSelected(id) ? Color.rose : Color.secondary)
        .accessibilityAddTraits(isSelected(id) ? .isSelected : [])
    }

    private func isSelected(_ id: UUID?) -> Bool {
        selectedPersonID == id
    }
}

private struct MemoryPhotoCard: View {
    @Environment(PhotoStore.self) private var photoStore
    let entry: JournalEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ZStack(alignment: .bottomLeading) {
                AsyncImage(url: photoStore.thumbnailURL(for: entry.sortedPhotos[0])) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    Color.mist
                        .overlay {
                            Image(systemName: "photo")
                                .font(.title2)
                                .foregroundStyle(.secondary)
                        }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 248)
                .clipped()

                VStack(alignment: .leading, spacing: 6) {
                    Text(entry.day.formatted(date: .abbreviated, time: .omitted))
                        .font(.headline)

                    HStack(spacing: 8) {
                        Label(entry.mood.title, systemImage: entry.mood.symbol)
                        if entry.sortedPhotos.count > 1 {
                            Label("\(entry.sortedPhotos.count)", systemImage: "photo.on.rectangle")
                        }
                        if entry.isComplete {
                            Label("Saved", systemImage: "checkmark.circle.fill")
                        }
                    }
                    .font(.caption.weight(.semibold))
                    .labelStyle(.titleAndIcon)
                }
                .foregroundStyle(.white)
                .shadow(radius: 8)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    LinearGradient(
                        colors: [.black.opacity(0), .black.opacity(0.58)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            }

            if let excerpt = entry.firstResponseExcerpt {
                Text(excerpt)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .padding(.horizontal, 14)
            }

            MemoryMetadataSummary(entry: entry)
                .padding(.horizontal, 14)
                .padding(.bottom, 12)
        }
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .padding(.horizontal)
    }
}

private struct WrittenMemoryCard: View {
    let entry: JournalEntry

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(spacing: 4) {
                Text(entry.day.formatted(.dateTime.day()))
                    .font(.title3.bold())
                Text(entry.day.formatted(.dateTime.month(.abbreviated)))
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            .frame(width: 54, height: 58)
            .background(Color.mist, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Label(entry.mood.title, systemImage: entry.mood.symbol)
                    if entry.isComplete {
                        Label("Saved", systemImage: "checkmark.circle.fill")
                    }
                }
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

                Text(entry.firstResponseExcerpt ?? "Open memory")
                    .font(.body)
                    .foregroundStyle(.primary)
                    .lineLimit(3)

                MemoryMetadataSummary(entry: entry)
            }

            Spacer(minLength: 0)
        }
        .journalCard()
        .padding(.horizontal)
    }
}

private struct MemoryMetadataSummary: View {
    let entry: JournalEntry

    private var people: [PersonTag] {
        entry.sortedPersonTags
    }

    private var details: [MemoryDetail] {
        entry.sortedDetails.filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    var body: some View {
        if !people.isEmpty || !details.isEmpty {
            HStack(spacing: 8) {
                if !people.isEmpty {
                    Label(people.map(\.name).joined(separator: ", "), systemImage: "person.2.fill")
                }

                if !details.isEmpty {
                    Label("\(details.count)", systemImage: "sparkles")
                }
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
    }
}

private extension JournalEntry {
    var firstResponseExcerpt: String? {
        sortedSessions
            .flatMap(\.sortedResponses)
            .map(\.text)
            .first { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }
}
