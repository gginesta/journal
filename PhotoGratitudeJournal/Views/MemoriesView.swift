import SwiftData
import SwiftUI

struct MemoriesView: View {
    @Environment(RouterPath.self) private var router
    @Query(sort: \JournalEntry.day, order: .reverse) private var entries: [JournalEntry]
    @Query(sort: \PersonTag.sortOrder) private var personTags: [PersonTag]
    @State private var selectedPersonID: UUID?
    @State private var selectedContentFilter: MemoryContentFilter = .all
    @State private var searchText = ""
    @AppStorage(ExperienceMode.storageKey) private var experienceModeRawValue = ExperienceMode.defaultMode.rawValue

    // SPEC-7: person/content filters are a Full surface; search stays in both
    // modes and still matches details and people text.
    private var showsFilters: Bool {
        ExperienceModeMap.isVisible(.memoriesFilters, in: ExperienceMode.fromStoredValue(experienceModeRawValue))
    }

    private var photoEntries: [JournalEntry] {
        filteredEntries.filter { !$0.sortedPhotos.isEmpty }
    }

    private var writtenEntries: [JournalEntry] {
        filteredEntries.filter { $0.sortedPhotos.isEmpty }
    }

    private var filteredEntries: [JournalEntry] {
        entries.filter { entry in
            // A lingering filter selection must not keep filtering invisibly
            // once the filter bar is hidden in Simple.
            (!showsFilters || (entryMatches(entry, personID: selectedPersonID) && selectedContentFilter.matches(entry))) &&
            entryMatchesSearch(entry)
        }
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
                    if showsFilters {
                        PersonFilterBar(
                            people: people,
                            selectedPersonID: $selectedPersonID,
                            selectedContentFilter: $selectedContentFilter,
                            hasSearchText: !normalizedSearchText.isEmpty,
                            resultCount: filteredEntries.count
                        )
                        .padding(.horizontal)
                    }

                    if filteredEntries.isEmpty {
                        EmptyStateView(
                            title: filteredEmptyTitle,
                            message: filteredEmptyMessage,
                            systemImage: "magnifyingglass"
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
        .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search memories")
    }

    private var normalizedSearchText: String {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var filteredEmptyTitle: String {
        if !normalizedSearchText.isEmpty {
            return "No memories found"
        }
        if selectedPersonID != nil {
            return "No memories for this person yet"
        }
        return "No memories in this filter yet"
    }

    private var filteredEmptyMessage: String {
        if !normalizedSearchText.isEmpty {
            return "Try another word, person, detail, prompt, or date."
        }
        if selectedPersonID != nil {
            return "Tag a person on Today or in a Little Detail, then their memories will collect here."
        }
        return "Switch filters or add a memory with this kind of saved content."
    }

    private func memoryAccessibilityLabel(for entry: JournalEntry) -> String {
        let date = entry.day.formatted(date: .long, time: .omitted)
        let photoCount = entry.sortedPhotos.count
        let completion = entry.isComplete ? "complete" : "not complete"
        let people = entry.memoryPeople.map(\.name).joined(separator: ", ")
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

    private func entryMatchesSearch(_ entry: JournalEntry) -> Bool {
        let query = normalizedSearchText
        guard !query.isEmpty else { return true }

        return searchableFields(for: entry).contains { field in
            field.localizedCaseInsensitiveContains(query)
        }
    }

    private func searchableFields(for entry: JournalEntry) -> [String] {
        var fields = [
            entry.day.formatted(date: .long, time: .omitted),
            entry.day.formatted(date: .abbreviated, time: .omitted),
            entry.day.formatted(.dateTime.month(.wide).day().year()),
            entry.day.formatted(.dateTime.month(.abbreviated).day().year())
        ]

        fields += entry.sortedPersonTags.map(\.name)

        for detail in entry.sortedDetails {
            fields.append(detail.text)
            fields.append(detail.detailCategory.title)
            fields.append(detail.category)
            fields += detail.sortedPersonTags.map(\.name)
        }

        for response in entry.sortedSessions.flatMap(\.sortedResponses) {
            fields.append(response.promptTitle)
            fields.append(response.promptText)
            fields.append(response.text)
        }

        return fields
    }
}

private struct PersonFilterBar: View {
    let people: [PersonTag]
    @Binding var selectedPersonID: UUID?
    @Binding var selectedContentFilter: MemoryContentFilter
    let hasSearchText: Bool
    let resultCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Filter memories", systemImage: "line.3.horizontal.decrease.circle")
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

            Picker("Memory type", selection: $selectedContentFilter) {
                ForEach(MemoryContentFilter.allCases) { filter in
                    Text(filter.title).tag(filter)
                }
            }
            .pickerStyle(.segmented)
        }
        .journalCard(padding: 14)
    }

    private var resultSummary: String {
        let count = resultCount == 1 ? "1 memory" : "\(resultCount) memories"
        return hasSearchText ? "\(count) found" : count
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

private enum MemoryContentFilter: String, CaseIterable, Identifiable {
    case all
    case photos
    case textOnly

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all: "All"
        case .photos: "Photos"
        case .textOnly: "Text"
        }
    }

    func matches(_ entry: JournalEntry) -> Bool {
        switch self {
        case .all:
            true
        case .photos:
            !entry.sortedPhotos.isEmpty
        case .textOnly:
            entry.sortedPhotos.isEmpty && entry.hasWrittenContent
        }
    }
}

private struct MemoryPhotoCard: View {
    @Environment(PhotoStore.self) private var photoStore
    let entry: JournalEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ZStack(alignment: .bottomLeading) {
                StoredPhotoImage(url: photoStore.thumbnailURL(for: entry.sortedPhotos[0])) { image in
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
        entry.memoryPeople
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
                    Label(detailSummary, systemImage: "sparkles")
                }
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
    }

    // "2 · Phrase, Milestone" when details carry categories; plain count when
    // every detail is the default note category.
    private var detailSummary: String {
        var seenCategories = Set<MemoryDetailCategory>()
        let categoryTitles = details
            .map(\.detailCategory)
            .filter { $0 != .note && seenCategories.insert($0).inserted }
            .map(\.title)

        guard !categoryTitles.isEmpty else { return "\(details.count)" }
        return "\(details.count) · \(categoryTitles.joined(separator: ", "))"
    }
}

private extension JournalEntry {
    var firstResponseExcerpt: String? {
        sortedSessions
            .flatMap(\.sortedResponses)
            .map(\.text)
            .first { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    var hasWrittenContent: Bool {
        sortedSessions
            .flatMap(\.sortedResponses)
            .contains { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty } ||
        sortedDetails
            .contains { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    var memoryPeople: [PersonTag] {
        var seenIDs = Set<UUID>()
        let detailPeople = sortedDetails
            .filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            .flatMap(\.sortedPersonTags)
        let candidates = sortedPersonTags + detailPeople

        return candidates.filter { person in
            if seenIDs.contains(person.id) {
                return false
            }
            seenIDs.insert(person.id)
            return true
        }
    }
}
