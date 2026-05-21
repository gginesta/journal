import SwiftData
import SwiftUI

struct PhotoStripView: View {
    @Environment(PhotoStore.self) private var photoStore
    let entry: JournalEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Photo of the day", systemImage: "camera")

            if entry.sortedPhotos.isEmpty {
                EmptyStateView(
                    title: "Add one or two photos",
                    message: "The image is the anchor. Words can stay light.",
                    systemImage: "photo"
                )
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(entry.sortedPhotos) { photo in
                            AsyncImage(url: photoStore.thumbnailURL(for: photo)) { image in
                                image
                                    .resizable()
                                    .scaledToFill()
                            } placeholder: {
                                Color.mist
                                    .overlay(Image(systemName: "photo").foregroundStyle(.secondary))
                            }
                            .frame(width: 168, height: 210)
                            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .journalCard()
    }
}

struct EntryPhotoGrid: View {
    @Environment(PhotoStore.self) private var photoStore
    let photos: [PhotoAttachment]

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            ForEach(photos) { photo in
                AsyncImage(url: photoStore.thumbnailURL(for: photo)) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Color.mist
                }
                .frame(height: 150)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
    }
}
