import SwiftData
import SwiftUI

struct TimelineView: View {
    @Environment(RouterPath.self) private var router
    @Query(sort: \JournalEntry.day, order: .reverse) private var entries: [JournalEntry]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                if entries.isEmpty {
                    EmptyStateView(
                        title: "Your photos will gather here",
                        message: "Add today’s photo and this becomes a quiet visual timeline.",
                        systemImage: "photo.on.rectangle"
                    )
                    .padding()
                } else {
                    ForEach(entries) { entry in
                        Button {
                            router.navigate(to: .entry(entry.id))
                        } label: {
                            TimelineEntryCard(entry: entry)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Timeline")
    }
}

private struct TimelineEntryCard: View {
    let entry: JournalEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(entry.day.formatted(date: .abbreviated, time: .omitted))
                        .font(.headline)
                    Text(entry.mood.title)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: entry.isComplete ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(entry.isComplete ? .leaf : .secondary)
            }

            if entry.sortedPhotos.isEmpty {
                Text(entry.sortedSessions.flatMap(\.sortedResponses).first(where: { !$0.text.isEmpty })?.text ?? "Open entry")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            } else {
                EntryPhotoGrid(photos: Array(entry.sortedPhotos.prefix(2)))
            }
        }
        .journalCard()
    }
}
