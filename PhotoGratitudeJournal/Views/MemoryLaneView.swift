import SwiftData
import SwiftUI

struct MemoryLaneView: View {
    @Environment(RouterPath.self) private var router
    @Environment(PhotoStore.self) private var photoStore
    let entries: [JournalEntry]

    var body: some View {
        let matches = MemoryLane.matches(today: .now, entries: entries)

        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Label("Memory Lane", systemImage: "clock.arrow.circlepath")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.ink)
                Text("A little window back to days like this one.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if matches.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Label(emptyMessage, systemImage: "sparkles")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    if let fallbackEntry {
                        RecentMemoryFallbackCard(entry: fallbackEntry) {
                            router.navigate(to: .entry(fallbackEntry.id))
                        }
                    }
                }
                .padding(14)
                .background(Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            } else {
                VStack(spacing: 12) {
                    ForEach(matches) { match in
                        if let entry = entry(for: match) {
                            MemoryLaneCard(match: match, entry: entry) {
                                router.navigate(to: .entry(match.entryID))
                            }
                        }
                    }
                }
            }
        }
        .journalCard()
    }

    private func entry(for match: MemoryMatch) -> JournalEntry? {
        entries.first { $0.id == match.entryID }
    }

    private var fallbackEntry: JournalEntry? {
        entries
            .filter { !Calendar.current.isDateInToday($0.day) }
            .sorted { $0.day > $1.day }
            .first
    }

    private var emptyMessage: String {
        if entries.isEmpty {
            return "Once you have older entries, this space will bring back moments from 1 month, 1 year, 2 years, and 3 years ago."
        }
        if fallbackEntry == nil {
            return "Save a few days and Memory Lane will have something older to bring back."
        }
        return "No look-backs line up with today yet. Here is a recent saved memory instead."
    }
}

private struct MemoryLaneCard: View {
    @Environment(PhotoStore.self) private var photoStore
    let match: MemoryMatch
    let entry: JournalEntry
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                thumbnail

                VStack(alignment: .leading, spacing: 5) {
                    Text(displayLabel)
                        .font(.headline)
                        .foregroundStyle(.ink)
                    Text(match.entryDate.formatted(date: .abbreviated, time: .omitted))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if let excerpt {
                        Text(excerpt)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }

                Spacer(minLength: 4)

                Image(systemName: "chevron.right")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
            }
            .padding(10)
            .background(Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(displayLabel), \(match.entryDate.formatted(date: .abbreviated, time: .omitted))")
    }

    @ViewBuilder
    private var thumbnail: some View {
        if let photo = entry.sortedPhotos.first {
            StoredPhotoImage(url: photoStore.thumbnailURL(for: photo)) { image in
                image
                    .resizable()
                    .scaledToFill()
            } placeholder: {
                Color.mist
                    .overlay(Image(systemName: "photo").foregroundStyle(.secondary))
            }
            .frame(width: 86, height: 94)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        } else {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.mist)
                .frame(width: 86, height: 94)
                .overlay {
                    Image(systemName: "quote.bubble")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
        }
    }

    private var displayLabel: String {
        if match.dayDistance == 0 {
            return match.label
        }
        return "Around \(match.label)"
    }

    private var excerpt: String? {
        entry.sortedSessions
            .flatMap(\.sortedResponses)
            .map(\.text)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first { !$0.isEmpty }
    }
}

private struct RecentMemoryFallbackCard: View {
    @Environment(PhotoStore.self) private var photoStore
    let entry: JournalEntry
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                thumbnail

                VStack(alignment: .leading, spacing: 5) {
                    Text("Recent memory")
                        .font(.headline)
                        .foregroundStyle(.ink)
                    Text(entry.day.formatted(date: .abbreviated, time: .omitted))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if let excerpt {
                        Text(excerpt)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }

                Spacer(minLength: 4)

                Image(systemName: "chevron.right")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
            }
            .padding(10)
            .background(Color.journalSurface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Recent memory, \(entry.day.formatted(date: .abbreviated, time: .omitted))")
    }

    @ViewBuilder
    private var thumbnail: some View {
        if let photo = entry.sortedPhotos.first {
            StoredPhotoImage(url: photoStore.thumbnailURL(for: photo)) { image in
                image
                    .resizable()
                    .scaledToFill()
            } placeholder: {
                Color.mist
                    .overlay(Image(systemName: "photo").foregroundStyle(.secondary))
            }
            .frame(width: 66, height: 72)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        } else {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.mist)
                .frame(width: 66, height: 72)
                .overlay {
                    Image(systemName: "quote.bubble")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
        }
    }

    private var excerpt: String? {
        entry.sortedSessions
            .flatMap(\.sortedResponses)
            .map(\.text)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first { !$0.isEmpty }
    }
}
