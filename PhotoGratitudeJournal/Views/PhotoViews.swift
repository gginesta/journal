import PhotosUI
import SwiftData
import SwiftUI

struct PhotoStripView: View {
    @Environment(PhotoStore.self) private var photoStore
    let entry: JournalEntry
    @Binding var selectedPhotos: [PhotosPickerItem]
    let isImporting: Bool

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            heroContent

            VStack(alignment: .leading, spacing: 10) {
                Text("Photo of the day")
                    .font(.caption.bold())
                    .textCase(.uppercase)
                    .foregroundStyle(.white.opacity(0.86))

                Text(entry.sortedPhotos.isEmpty ? "Start with one image from today." : "Let the photo hold most of the story.")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.white)
                    .shadow(radius: 8)

                PhotosPicker(selection: $selectedPhotos, maxSelectionCount: 2, matching: .images) {
                    Label(isImporting ? "Adding..." : entry.sortedPhotos.isEmpty ? "Add a photo" : "Add another", systemImage: isImporting ? "hourglass" : "photo.badge.plus")
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(.regularMaterial, in: Capsule())
                }
                .disabled(isImporting)
                .buttonStyle(.plain)
                .foregroundStyle(.ink)
                .accessibilityLabel(isImporting ? "Adding photo" : "Add photo to today's entry")
            }
            .padding(18)
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: 320)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder
    private var heroContent: some View {
        if let photo = entry.sortedPhotos.first {
            AsyncImage(url: photoStore.thumbnailURL(for: photo)) { image in
                image
                    .resizable()
                    .scaledToFill()
            } placeholder: {
                Color.mist
                    .overlay(Image(systemName: "photo").font(.largeTitle).foregroundStyle(.secondary))
            }
            .overlay(alignment: .bottom) {
                LinearGradient(colors: [.clear, .black.opacity(0.56)], startPoint: .top, endPoint: .bottom)
            }
        } else {
            LinearGradient(colors: [Color.dawn.opacity(0.56), Color.leaf.opacity(0.42), Color.ink.opacity(0.72)], startPoint: .topLeading, endPoint: .bottomTrailing)
                .overlay {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.system(size: 58, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.42))
                }
                .overlay(alignment: .bottom) {
                    LinearGradient(colors: [.clear, .black.opacity(0.38)], startPoint: .top, endPoint: .bottom)
                }
        }
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
