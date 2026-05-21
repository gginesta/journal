import PhotosUI
import SwiftData
import SwiftUI

struct TodayView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(PhotoStore.self) private var photoStore
    @Query(sort: \JournalEntry.day, order: .reverse) private var entries: [JournalEntry]
    @Query(filter: #Predicate<PromptTemplate> { $0.isEnabled == true }, sort: \PromptTemplate.order) private var prompts: [PromptTemplate]
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var importingPhotos = false
    @State private var entry: JournalEntry?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header

                if let entry {
                    PhotoStripView(entry: entry)
                    MoodPicker(entry: entry)
                    promptSections(entry: entry)
                    MemoryLaneView(entries: entries)
                }
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Today")
        .toolbar {
            PhotosPicker(selection: $selectedPhotos, maxSelectionCount: 2, matching: .images) {
                Label("Add photo", systemImage: "photo.badge.plus")
            }
        }
        .task {
            entry = JournalStore.entry(for: .now, in: modelContext)
        }
        .onChange(of: selectedPhotos) { _, items in
            Task { await importSelectedPhotos(items) }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(Date.now.formatted(date: .complete, time: .omitted))
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text("What felt good today?")
                .font(.largeTitle.bold())
                .foregroundStyle(.ink)

            if let entry {
                let summary = StreakCalculator.summary(entries: entries)
                HStack(spacing: 10) {
                    Label("\(summary.current) day streak", systemImage: "flame.fill")
                        .foregroundStyle(.rose)
                    Label(entry.isComplete ? "Complete" : "Open", systemImage: entry.isComplete ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(entry.isComplete ? .leaf : .secondary)
                }
                .font(.subheadline.bold())
            }
        }
    }

    @ViewBuilder
    private func promptSections(entry: JournalEntry) -> some View {
        ForEach(entry.sortedSessions) { session in
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: session.kind.title, systemImage: session.kind.icon)

                ForEach(session.sortedResponses) { response in
                    PromptResponseCard(response: response)
                }
            }
            .journalCard()
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

private struct PromptResponseCard: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var response: PromptResponse

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(response.promptText)
                .font(.headline)
            TextField("A few words is enough", text: $response.text, axis: .vertical)
                .textFieldStyle(.plain)
                .lineLimit(2...8)
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
            SectionHeader(title: "Mood", systemImage: "heart")
            HStack {
                ForEach(Mood.allCases) { mood in
                    Button {
                        JournalStore.updateMood(entry, mood: mood, in: modelContext)
                    } label: {
                        VStack(spacing: 6) {
                            Image(systemName: mood.symbol)
                                .font(.headline)
                            Text(mood.title)
                                .font(.caption2)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(entry.mood == mood ? Color.rose.opacity(0.16) : Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(entry.mood == mood ? .rose : .secondary)
                }
            }
        }
        .journalCard()
    }
}
