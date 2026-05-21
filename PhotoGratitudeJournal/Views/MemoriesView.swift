import SwiftData
import SwiftUI

struct MemoriesView: View {
    @Environment(RouterPath.self) private var router
    @Query(sort: \JournalEntry.day, order: .reverse) private var entries: [JournalEntry]

    private var photoEntries: [JournalEntry] {
        entries.filter { !$0.sortedPhotos.isEmpty }
    }

    private var writtenEntries: [JournalEntry] {
        entries.filter { $0.sortedPhotos.isEmpty }
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
    }

    private func memoryAccessibilityLabel(for entry: JournalEntry) -> String {
        let date = entry.day.formatted(date: .long, time: .omitted)
        let photoCount = entry.sortedPhotos.count
        let completion = entry.isComplete ? "complete" : "not complete"

        if photoCount > 0 {
            let photoLabel = photoCount == 1 ? "1 photo" : "\(photoCount) photos"
            return "\(date), \(photoLabel), \(entry.mood.title), \(completion)"
        } else {
            return "\(date), written memory, \(entry.mood.title), \(completion)"
        }
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
                    .padding(.bottom, 12)
            }
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
            }

            Spacer(minLength: 0)
        }
        .journalCard()
        .padding(.horizontal)
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
