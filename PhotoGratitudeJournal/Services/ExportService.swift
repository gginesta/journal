import Foundation

// SPEC-5: exported JSON uses the shared wire strings — mood as Mood.wireName
// ("low"..."glowing"), Little Detail categories as MemoryDetailCategory raw
// values, person tags as their user-authored names.
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
    let people: [String]
    let responses: [ExportResponse]
    let details: [ExportDetail]
    let photos: [ExportPhoto]

    init(entry: JournalEntry) {
        id = entry.id
        day = entry.day
        mood = entry.mood.wireName
        isComplete = entry.isComplete
        people = entry.sortedPersonTags.map(\.name)
        responses = entry.sortedSessions.flatMap { session in
            session.sortedResponses.map { response in
                ExportResponse(
                    session: session.kind.rawValue,
                    prompt: response.promptText,
                    text: response.text
                )
            }
        }
        details = entry.sortedDetails.map {
            ExportDetail(text: $0.text, category: $0.detailCategory.rawValue, people: $0.sortedPersonTags.map(\.name))
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

private struct ExportDetail: Encodable {
    let text: String
    let category: String
    let people: [String]
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
