import PhotosUI
import SwiftData
import SwiftUI

struct TodayView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(PhotoStore.self) private var photoStore
    @Query(sort: \JournalEntry.day, order: .reverse) private var entries: [JournalEntry]
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var importingPhotos = false
    @State private var entry: JournalEntry?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let entry {
                    TodayHeader(entry: entry, entries: entries)
                    PhotoStripView(entry: entry, selectedPhotos: $selectedPhotos, isImporting: importingPhotos)
                    CompletionBanner(isComplete: entry.isComplete)
                    promptSections(entry: entry)
                    MoodPicker(entry: entry)
                    MemoryLaneView(entries: entries)
                }
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Today")
        .task {
            entry = JournalStore.entry(for: .now, in: modelContext)
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
        defer {
            importingPhotos = false
            selectedPhotos = []
        }

        for item in items {
            if let attachment = try? await photoStore.importPhoto(from: item) {
                JournalStore.addPhoto(attachment, to: entry, in: modelContext)
            }
        }
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
