import PhotosUI
import SwiftData
import SwiftUI

struct TodayView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(PhotoStore.self) private var photoStore
    @Query(sort: \JournalEntry.day, order: .reverse) private var entries: [JournalEntry]
    @Query(sort: \PersonTag.sortOrder) private var personTags: [PersonTag]
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var importingPhotos = false
    @State private var photoImportMessage: String?
    @State private var entry: JournalEntry?
    @AppStorage("hasSeenBetaWelcome") private var hasSeenBetaWelcome = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let entry {
                    TodayHeader(entry: entry, entries: entries)
                    if !hasSeenBetaWelcome {
                        BetaWelcomeCard {
                            hasSeenBetaWelcome = true
                        }
                    }
                    PhotoStripView(
                        entry: entry,
                        selectedPhotos: $selectedPhotos,
                        isImporting: importingPhotos,
                        importErrorMessage: photoImportMessage
                    ) { photo in
                        removePhoto(photo, from: entry)
                    }
                    PeopleTagEditor(entry: entry, people: sortedPeople)
                    CompletionBanner(isComplete: entry.isComplete)
                    promptSections(entry: entry)
                    LittleDetailsEditor(entry: entry, people: sortedPeople)
                    MoodPicker(entry: entry)
                    MemoryLaneView(entries: entries)
                }
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Today")
        .task {
            JournalStore.seedDefaultPersonTagsIfNeeded(in: modelContext)
            let todayEntry = JournalStore.entry(for: .now, in: modelContext)
            entry = todayEntry
        }
        .onChange(of: selectedPhotos) { _, items in
            Task { await importSelectedPhotos(items) }
        }
    }

    @ViewBuilder
    private func promptSections(entry: JournalEntry) -> some View {
        let responses = entry.sortedSessions.flatMap(\.sortedResponses)

        if let mainResponse = responses.first {
            PromptListInput(response: mainResponse)
        }

        let secondaryResponses = Array(responses.dropFirst())
        if !secondaryResponses.isEmpty {
            SecondaryPromptSection(responses: secondaryResponses)
        }
    }

    private func importSelectedPhotos(_ items: [PhotosPickerItem]) async {
        guard let entry, !items.isEmpty else { return }
        importingPhotos = true
        photoImportMessage = nil
        defer {
            importingPhotos = false
            selectedPhotos = []
        }

        let remainingSlots = max(0, 2 - entry.sortedPhotos.count)
        guard remainingSlots > 0 else {
            photoImportMessage = "Two photos is plenty for today."
            return
        }

        var failedImports = 0
        for item in items.prefix(remainingSlots) {
            do {
                let attachment = try await photoStore.importPhoto(from: item)
                JournalStore.addPhoto(attachment, to: entry, in: modelContext)
            } catch {
                failedImports += 1
            }
        }

        if failedImports > 0 {
            photoImportMessage = failedImports == 1 ? "One photo could not be added." : "\(failedImports) photos could not be added."
        } else if items.count > remainingSlots {
            photoImportMessage = remainingSlots == 1 ? "Saved the first photo. Keep today to one or two photos." : "Saved the first two photos. Keep today to one or two photos."
        }
    }

    private func removePhoto(_ photo: PhotoAttachment, from entry: JournalEntry) {
        photoStore.deleteFiles(for: photo)
        JournalStore.removePhoto(photo, from: entry, in: modelContext)
        photoImportMessage = nil
    }

    private var sortedPeople: [PersonTag] {
        personTags.sorted { lhs, rhs in
            if lhs.sortOrder == rhs.sortOrder {
                return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
            }
            return lhs.sortOrder < rhs.sortOrder
        }
    }
}

private struct BetaWelcomeCard: View {
    let dismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "sparkles")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.rose)
                    .frame(width: 38, height: 38)
                    .background(Color.rose.opacity(0.12), in: Circle())
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Welcome to the private beta")
                        .font(.headline)
                        .foregroundStyle(.ink)
                    Text("Start with one photo or one nice thing. People and Little Details are optional, and everything is designed to stay private.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                betaHint("Add a photo if one moment stands out.", systemImage: "photo")
                betaHint("Tag Me, family, or each child when useful.", systemImage: "person.2")
                betaHint("Capture tiny phrases, favorites, and milestones.", systemImage: "sparkle")
            }

            Button(action: dismiss) {
                Text("Got it")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 42)
            }
            .buttonStyle(.borderedProminent)
            .tint(.rose)
        }
        .journalCard()
        .accessibilityElement(children: .contain)
    }

    private func betaHint(_ text: String, systemImage: String) -> some View {
        Label(text, systemImage: systemImage)
            .font(.caption)
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)
    }
}

private struct TodayHeader: View {
    let entry: JournalEntry
    let entries: [JournalEntry]

    var body: some View {
        let summary = StreakCalculator.summary(entries: entries)

        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center, spacing: 10) {
                Text(Date.now.formatted(date: .complete, time: .omitted))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer(minLength: 8)
                StreakPill(days: summary.current)
            }

            Text("What felt good today?")
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .contain)
    }
}

private struct PromptListInput: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var response: PromptResponse

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Three nice things")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.ink)
                Text(response.promptText)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            VStack(spacing: 10) {
                ForEach(0..<3, id: \.self) { index in
                    HStack(alignment: .top, spacing: 10) {
                        Text("\(index + 1)")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.rose)
                            .frame(width: 28, height: 28)
                            .background(Color.rose.opacity(0.12), in: Circle())

                        TextField(placeholders[index], text: lineBinding(for: index), axis: .vertical)
                            .textFieldStyle(.plain)
                            .lineLimit(1...3)
                            .font(.body)
                            .padding(.vertical, 4)
                    }
                    .padding(12)
                    .background(Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
            }

            Text("A phrase is enough. Leave blanks if today was simple.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .journalCard()
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Three nice things")
    }

    private var placeholders: [String] {
        ["A small good thing", "Another nice moment", "One more, if it fits"]
    }

    private func lineBinding(for index: Int) -> Binding<String> {
        Binding {
            line(at: index)
        } set: { newValue in
            JournalStore.updateResponse(response, text: text(replacingLineAt: index, with: newValue), in: modelContext)
        }
    }

    private func line(at index: Int) -> String {
        let lines = response.text.components(separatedBy: .newlines)
        guard lines.indices.contains(index) else { return "" }
        return lines[index]
    }

    private func text(replacingLineAt index: Int, with newValue: String) -> String {
        var lines = response.text.components(separatedBy: .newlines)
        while lines.count <= index {
            lines.append("")
        }
        lines[index] = newValue

        while lines.last?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == true {
            lines.removeLast()
        }

        return lines.joined(separator: "\n")
    }
}

private struct SecondaryPromptSection: View {
    let responses: [PromptResponse]

    var body: some View {
        DisclosureGroup {
            VStack(alignment: .leading, spacing: 12) {
                ForEach(responses) { response in
                    SecondaryPromptEditor(response: response)
                }
            }
            .padding(.top, 10)
        } label: {
            Label("More reflections", systemImage: "text.bubble")
                .font(.headline)
                .foregroundStyle(.ink)
        }
        .tint(.rose)
        .journalCard()
    }
}

private struct SecondaryPromptEditor: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var response: PromptResponse

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(response.promptText)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.ink)
            TextField("Optional", text: $response.text, axis: .vertical)
                .textFieldStyle(.plain)
                .lineLimit(2...6)
                .padding(12)
                .background(Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .onChange(of: response.text) { _, newValue in
                    JournalStore.updateResponse(response, text: newValue, in: modelContext)
                }
        }
    }
}

private struct MoodPicker: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var entry: JournalEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Mood, optional", systemImage: "heart")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
            }

            HStack {
                ForEach(Mood.allCases) { mood in
                    Button {
                        JournalStore.updateMood(entry, mood: mood, in: modelContext)
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: mood.symbol)
                                .font(.subheadline)
                            Text(mood.title)
                                .font(.caption2)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: 48)
                        .background(entry.mood == mood ? Color.rose.opacity(0.12) : Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(entry.mood == mood ? .rose : .secondary)
                    .accessibilityLabel("Mood \(mood.title)")
                    .accessibilityAddTraits(entry.mood == mood ? .isSelected : [])
                }
            }
        }
        .journalCard()
    }
}

struct PeopleTagEditor: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var entry: JournalEntry
    let people: [PersonTag]

    @State private var newPersonName = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Label("People, optional", systemImage: "person.2")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text("Private labels for anyone woven into this memory.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            PeopleChipRow(
                people: people,
                selectedPersonIDs: selectedPersonIDs,
                emptySelectionTitle: "No people tagged yet",
                onToggle: togglePerson
            )

            HStack(spacing: 8) {
                TextField("Add a private person", text: $newPersonName)
                    .textFieldStyle(.plain)
                    .submitLabel(.done)
                    .onSubmit(addPerson)
                    .padding(.horizontal, 12)
                    .frame(minHeight: 42)
                    .background(Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                Button(action: addPerson) {
                    Image(systemName: "plus")
                        .font(.subheadline.weight(.bold))
                        .frame(width: 42, height: 42)
                        .background(Color.rose.opacity(0.12), in: Circle())
                }
                .buttonStyle(.plain)
                .foregroundStyle(.rose)
                .accessibilityLabel("Add person tag")
            }
        }
        .journalCard()
    }

    private var selectedPersonIDs: Set<UUID> {
        Set(entry.sortedPersonTags.map(\.id))
    }

    private func togglePerson(_ person: PersonTag) {
        if selectedPersonIDs.contains(person.id) {
            JournalStore.removePersonTag(person, from: entry, in: modelContext)
        } else {
            JournalStore.assignPersonTag(person, to: entry, in: modelContext)
        }
    }

    private func addPerson() {
        let trimmedName = newPersonName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        if let person = JournalStore.addPersonTag(named: trimmedName, in: modelContext) {
            JournalStore.assignPersonTag(person, to: entry, in: modelContext)
        }
        newPersonName = ""
    }
}

struct LittleDetailsEditor: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var entry: JournalEntry
    let people: [PersonTag]

    @State private var newDetailText = ""

    var body: some View {
        DisclosureGroup {
            VStack(alignment: .leading, spacing: 12) {
                if entry.sortedDetails.isEmpty {
                    Text("Tiny phases, favorite things, routines, milestones, or funny lines can live here.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                ForEach(entry.sortedDetails) { detail in
                    LittleDetailRow(entry: entry, detail: detail, people: people)
                }

                HStack(alignment: .top, spacing: 8) {
                    TextField("A phrase, phase, favorite, or tiny milestone", text: $newDetailText, axis: .vertical)
                        .textFieldStyle(.plain)
                        .lineLimit(1...4)
                        .padding(12)
                        .background(Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .submitLabel(.done)
                        .onSubmit(addDetail)

                    Button(action: addDetail) {
                        Image(systemName: "plus")
                            .font(.subheadline.weight(.bold))
                            .frame(width: 42, height: 42)
                            .background(Color.rose.opacity(0.12), in: Circle())
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.rose)
                    .accessibilityLabel("Add little detail")
                }
            }
            .padding(.top, 10)
        } label: {
            Label("Little Details", systemImage: "sparkles")
                .font(.headline)
                .foregroundStyle(.ink)
        }
        .tint(.rose)
        .journalCard()
    }

    private func addDetail() {
        let trimmedText = newDetailText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedText.isEmpty else { return }
        _ = JournalStore.addLittleDetail(text: trimmedText, to: entry, in: modelContext)
        newDetailText = ""
    }
}

private struct LittleDetailRow: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var entry: JournalEntry
    @Bindable var detail: MemoryDetail
    let people: [PersonTag]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            TextField("A phrase, phase, favorite, or tiny milestone", text: $detail.text, axis: .vertical)
                .textFieldStyle(.plain)
                .lineLimit(1...4)
                .font(.body)
                .padding(12)
                .background(Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .onChange(of: detail.text) { _, _ in
                    detail.updatedAt = .now
                    detail.entry?.updatedAt = .now
                    Persistence.save(modelContext, operation: "Update detail tags")
                }

            PeopleChipRow(
                people: people,
                selectedPersonIDs: Set(detail.sortedPersonTags.map(\.id)),
                emptySelectionTitle: "Tag people for this detail",
                compact: true
            ) { togglePerson($0) }

            Button(role: .destructive) {
                JournalStore.removeLittleDetail(detail, from: entry, in: modelContext)
            } label: {
                Label("Remove detail", systemImage: "trash")
                    .font(.caption.weight(.semibold))
                    .frame(minHeight: 34)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
        }
        .padding(12)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func togglePerson(_ person: PersonTag) {
        if detail.sortedPersonTags.contains(where: { $0.id == person.id }) {
            JournalStore.removePersonTag(person, from: detail, in: modelContext)
        } else {
            JournalStore.assignPersonTag(person, to: detail, in: modelContext)
        }
    }
}

struct PeopleChipRow: View {
    let people: [PersonTag]
    let selectedPersonIDs: Set<UUID>
    let emptySelectionTitle: String
    var compact = false
    let onToggle: (PersonTag) -> Void

    var body: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                ForEach(people) { person in
                    Button {
                        onToggle(person)
                    } label: {
                        Label(person.name, systemImage: selectedPersonIDs.contains(person.id) ? "checkmark.circle.fill" : "circle")
                            .font(compact ? .caption.weight(.semibold) : .subheadline.weight(.semibold))
                            .lineLimit(1)
                            .padding(.horizontal, compact ? 10 : 12)
                            .frame(minHeight: compact ? 34 : 40)
                            .background(backgroundColor(for: person), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(selectedPersonIDs.contains(person.id) ? Color.rose : Color.secondary)
                    .accessibilityLabel("\(person.name) person tag")
                    .accessibilityAddTraits(selectedPersonIDs.contains(person.id) ? .isSelected : [])
                }

                if selectedPersonIDs.isEmpty {
                    Text(emptySelectionTitle)
                        .font(compact ? .caption : .subheadline)
                        .foregroundStyle(.secondary)
                        .frame(minHeight: compact ? 34 : 40)
                }
            }
            .padding(.vertical, 1)
        }
        .scrollIndicators(.hidden)
    }

    private func backgroundColor(for person: PersonTag) -> Color {
        selectedPersonIDs.contains(person.id) ? Color.rose.opacity(0.12) : Color(.tertiarySystemBackground)
    }
}

struct PeopleChipSummary: View {
    let people: [PersonTag]

    var body: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                ForEach(people) { person in
                    Label(person.name, systemImage: "person.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.rose)
                        .padding(.horizontal, 10)
                        .frame(minHeight: 32)
                        .background(Color.rose.opacity(0.12), in: Capsule())
                }
            }
            .padding(.vertical, 1)
        }
        .scrollIndicators(.hidden)
    }
}
