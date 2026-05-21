import Foundation
import PhotosUI
import SwiftUI
import UIKit

@MainActor
@Observable
final class PhotoStore {
    private let directoryName = "JournalPhotos"
    private let thumbnailPrefix = "thumb-"

    func importPhoto(from item: PhotosPickerItem) async throws -> PhotoAttachment {
        guard let data = try await item.loadTransferable(type: Data.self) else {
            throw PhotoStoreError.missingImageData
        }

        let id = UUID()
        let originalFilename = "\(id.uuidString).jpg"
        let thumbnailFilename = "\(thumbnailPrefix)\(id.uuidString).jpg"

        try data.write(to: photoDirectory().appendingPathComponent(originalFilename), options: [.atomic])
        let thumbnailData = try makeThumbnailData(from: data)
        try thumbnailData.write(to: photoDirectory().appendingPathComponent(thumbnailFilename), options: [.atomic])

        return PhotoAttachment(
            id: id,
            originalFilename: originalFilename,
            thumbnailFilename: thumbnailFilename,
            localIdentifier: item.itemIdentifier
        )
    }

    func imageURL(for attachment: PhotoAttachment) -> URL {
        photoDirectory().appendingPathComponent(attachment.originalFilename)
    }

    func thumbnailURL(for attachment: PhotoAttachment) -> URL {
        photoDirectory().appendingPathComponent(attachment.thumbnailFilename)
    }

    func deleteFiles(for attachment: PhotoAttachment) {
        try? FileManager.default.removeItem(at: imageURL(for: attachment))
        try? FileManager.default.removeItem(at: thumbnailURL(for: attachment))
    }

    private func photoDirectory() -> URL {
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let directory = support.appendingPathComponent(directoryName, isDirectory: true)
        if !FileManager.default.fileExists(atPath: directory.path) {
            try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try? FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: directory.path)
        }
        return directory
    }

    private func makeThumbnailData(from data: Data) throws -> Data {
        guard let image = UIImage(data: data) else { throw PhotoStoreError.invalidImage }
        let maxLength: CGFloat = 420
        let scale = min(maxLength / image.size.width, maxLength / image.size.height, 1)
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: size)
        let thumbnail = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
        guard let jpeg = thumbnail.jpegData(compressionQuality: 0.78) else {
            throw PhotoStoreError.invalidImage
        }
        return jpeg
    }
}

enum PhotoStoreError: LocalizedError {
    case missingImageData
    case invalidImage

    var errorDescription: String? {
        switch self {
        case .missingImageData: "The selected photo could not be loaded."
        case .invalidImage: "The selected file is not a readable image."
        }
    }
}
