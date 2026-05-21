import Foundation

enum ExportService {
    static func export(entries: [JournalEntry]) throws -> URL {
        let payload = entries
            .sorted { $0.day > $1.day }
            .map(ExportEntry.init(entry:))
        let data = try JSONEncoder.prettyDateEncoder.encode(payload)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("PhotoGratitudeJournalExport.json")
        try data.write(to: url, options: [.atomic])
        return url
    }
}

private struct ExportEntry: Encodable {
    let id: UUID
    let day: Date
    let mood: String
    let isComplete: Bool
    let responses: [ExportResponse]
    let photos: [ExportPhoto]

    init(entry: JournalEntry) {
        id = entry.id
        day = entry.day
        mood = entry.mood.title
        isComplete = entry.isComplete
        responses = entry.sortedSessions.flatMap { session in
            session.sortedResponses.map { response in
                ExportResponse(
                    session: session.kind.title,
                    prompt: response.promptText,
                    text: response.text
                )
            }
        }
        photos = entry.sortedPhotos.map {
            ExportPhoto(filename: $0.originalFilename, caption: $0.caption, createdAt: $0.createdAt)
        }
    }
}

private struct ExportResponse: Encodable {
    let session: String
    let prompt: String
    let text: String
}

private struct ExportPhoto: Encodable {
    let filename: String
    let caption: String
    let createdAt: Date
}

private extension JSONEncoder {
    static var prettyDateEncoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}
