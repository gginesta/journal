import PhotosUI
import SwiftUI
import UIKit

struct PhotoStripView: View {
    @Environment(PhotoStore.self) private var photoStore
    let entry: JournalEntry
    @Binding var selectedPhotos: [PhotosPickerItem]
    let isImporting: Bool
    let importErrorMessage: String?
    let onRemovePhoto: (PhotoAttachment) -> Void

    @State private var previewPhoto: PhotoAttachment?
    @State private var photoPendingRemoval: PhotoAttachment?

    private let maxPhotoCount = 2

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            heroContent

            VStack(alignment: .leading, spacing: 10) {
                Text("Photo of the day")
                    .font(.caption.bold())
                    .textCase(.uppercase)
                    .foregroundStyle(.white.opacity(0.86))

                Text(headline)
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.white)
                    .shadow(radius: 8)

                Text(guidance)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.86))
                    .fixedSize(horizontal: false, vertical: true)

                photoActions

                if let importErrorMessage {
                    Label(importErrorMessage, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.rose.opacity(0.82), in: Capsule())
                }
            }
            .padding(18)
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: 320)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .accessibilityElement(children: .contain)
        .sheet(item: $previewPhoto) { photo in
            PhotoPreviewSheet(photo: photo, canRemove: true) {
                onRemovePhoto(photo)
            }
        }
        .confirmationDialog("Remove this photo?", isPresented: removeConfirmationBinding, titleVisibility: .visible) {
            Button("Remove Photo", role: .destructive) {
                if let photoPendingRemoval {
                    onRemovePhoto(photoPendingRemoval)
                }
                photoPendingRemoval = nil
            }
            Button("Cancel", role: .cancel) {
                photoPendingRemoval = nil
            }
        } message: {
            Text("The journal entry stays saved.")
        }
    }

    @ViewBuilder
    private var heroContent: some View {
        if let photo = entry.sortedPhotos.first {
            Button {
                previewPhoto = photo
            } label: {
                StoredPhotoImage(url: photoStore.imageURL(for: photo)) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    Color.mist
                        .overlay(Image(systemName: "photo").font(.largeTitle).foregroundStyle(.secondary))
                }
            }
            .buttonStyle(.plain)
            .overlay(alignment: .bottom) {
                LinearGradient(colors: [.clear, .black.opacity(0.56)], startPoint: .top, endPoint: .bottom)
            }
            .accessibilityLabel("Preview photo")
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

    @ViewBuilder
    private var photoActions: some View {
        VStack(alignment: .leading, spacing: 10) {
            if !entry.sortedPhotos.isEmpty {
                PhotoThumbnailRow(
                    photos: entry.sortedPhotos,
                    previewPhoto: $previewPhoto,
                    photoPendingRemoval: $photoPendingRemoval
                )
            }

            if remainingPhotoSlots > 0 {
                PhotosPicker(selection: $selectedPhotos, maxSelectionCount: remainingPhotoSlots, matching: .images) {
                    Label(pickerTitle, systemImage: isImporting ? "hourglass" : "photo.badge.plus")
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(.regularMaterial, in: Capsule())
                }
                .disabled(isImporting)
                .buttonStyle(.plain)
                .foregroundStyle(.ink)
                .accessibilityLabel(isImporting ? "Adding photo" : "Add photo to today's entry")
                .accessibilityHint("Choose one or two photos for today")
            } else {
                Label("Two photos saved", systemImage: "checkmark.circle.fill")
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(.regularMaterial, in: Capsule())
                    .foregroundStyle(.ink)
            }
        }
    }

    private var headline: String {
        switch entry.sortedPhotos.count {
        case 0: "Start with one photo, if one moment stands out."
        case 1: "One photo can hold the whole story."
        default: "Two photos saved for today."
        }
    }

    private var guidance: String {
        switch entry.sortedPhotos.count {
        case 0: "Optional. One or two photos is plenty for a day."
        case 1: "Add one more only if it helps. Tap the photo to preview."
        default: "Tap a photo to preview, or remove one if the day feels simpler."
        }
    }

    private var pickerTitle: String {
        if isImporting {
            "Adding..."
        } else if entry.sortedPhotos.isEmpty {
            "Add photo"
        } else {
            "Add one more"
        }
    }

    private var remainingPhotoSlots: Int {
        max(0, maxPhotoCount - entry.sortedPhotos.count)
    }

    private var removeConfirmationBinding: Binding<Bool> {
        Binding {
            photoPendingRemoval != nil
        } set: { isPresented in
            if !isPresented {
                photoPendingRemoval = nil
            }
        }
    }
}

struct EntryPhotoGrid: View {
    @Environment(PhotoStore.self) private var photoStore
    let photos: [PhotoAttachment]
    @State private var previewPhoto: PhotoAttachment?

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            ForEach(photos) { photo in
                Button {
                    previewPhoto = photo
                } label: {
                    StoredPhotoImage(url: photoStore.thumbnailURL(for: photo)) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Color.mist
                    }
                    .frame(height: 150)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Preview photo")
            }
        }
        .sheet(item: $previewPhoto) { photo in
            PhotoPreviewSheet(photo: photo)
        }
    }
}

private struct PhotoThumbnailRow: View {
    @Environment(PhotoStore.self) private var photoStore
    let photos: [PhotoAttachment]
    @Binding var previewPhoto: PhotoAttachment?
    @Binding var photoPendingRemoval: PhotoAttachment?

    var body: some View {
        HStack(spacing: 10) {
            ForEach(photos) { photo in
                ZStack(alignment: .topTrailing) {
                    Button {
                        previewPhoto = photo
                    } label: {
                        StoredPhotoImage(url: photoStore.thumbnailURL(for: photo)) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Color.mist
                        }
                        .frame(width: 64, height: 64)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Preview photo")

                    Button {
                        photoPendingRemoval = photo
                    } label: {
                        Image(systemName: "xmark")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 24, height: 24)
                            .background(.black.opacity(0.48), in: Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Remove photo")
                    .padding(4)
                }
            }
        }
    }
}

private struct PhotoPreviewSheet: View {
    @Environment(PhotoStore.self) private var photoStore
    @Environment(\.dismiss) private var dismiss
    let photo: PhotoAttachment
    var canRemove = false
    var onRemove: (() -> Void)?

    @State private var showingRemoveConfirmation = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                StoredPhotoImage(url: photoStore.imageURL(for: photo)) { image in
                    image
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } placeholder: {
                    ContentUnavailableView("Photo unavailable", systemImage: "photo")
                        .foregroundStyle(.white)
                }
                .padding(.vertical)
            }
            .navigationTitle("Photo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }

                if canRemove {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(role: .destructive) {
                            showingRemoveConfirmation = true
                        } label: {
                            Image(systemName: "trash")
                        }
                        .accessibilityLabel("Remove photo")
                    }
                }
            }
            .toolbarColorScheme(.dark, for: .navigationBar)
            .confirmationDialog("Remove this photo?", isPresented: $showingRemoveConfirmation, titleVisibility: .visible) {
                Button("Remove Photo", role: .destructive) {
                    onRemove?()
                    dismiss()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("The journal entry stays saved.")
            }
        }
    }
}

struct StoredPhotoImage<Content: View, Placeholder: View>: View {
    let url: URL
    private let content: (Image) -> Content
    private let placeholder: () -> Placeholder

    init(
        url: URL,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }

    var body: some View {
        if let image = UIImage(contentsOfFile: url.path) {
            content(Image(uiImage: image))
        } else {
            placeholder()
        }
    }
}
