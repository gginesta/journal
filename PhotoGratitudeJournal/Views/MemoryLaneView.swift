import SwiftData
import SwiftUI

struct MemoryLaneView: View {
    @Environment(RouterPath.self) private var router
    let entries: [JournalEntry]

    var body: some View {
        let matches = MemoryLane.matches(today: .now, entries: entries)

        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Memory Lane", systemImage: "clock.arrow.circlepath")

            if matches.isEmpty {
                Text("When you have older entries, this spot will bring back little windows from 1 month, 1 year, 2 years, and 3 years ago.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                ForEach(matches) { match in
                    Button {
                        router.navigate(to: .entry(match.entryID))
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(match.label)
                                    .font(.headline)
                                Text(match.entryDate.formatted(date: .abbreviated, time: .omitted))
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption.bold())
                                .foregroundStyle(.secondary)
                        }
                        .padding(12)
                        .background(Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .journalCard()
    }
}
