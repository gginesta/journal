import Foundation
import SwiftData

@Model
final class JournalEntry: Identifiable {
    var id: UUID = UUID()
    var day: Date = Date()
    var createdAt: Date = Date()
    var updatedAt: Date = Date()
    var moodRawValue: Int = Mood.good.rawValue
    var note: String = ""

    @Relationship(deleteRule: .cascade, inverse: \JournalSession.entry) var sessions: [JournalSession]? = []
    @Relationship(deleteRule: .cascade, inverse: \PhotoAttachment.entry) var photos: [PhotoAttachment]? = []
    @Relationship(deleteRule: .cascade, inverse: \EntryPersonTag.entry) var personLinks: [EntryPersonTag]? = []
    @Relationship(deleteRule: .cascade, inverse: \MemoryDetail.entry) var details: [MemoryDetail]? = []

    init(
        id: UUID = UUID(),
        day: Date,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        mood: Mood = .good,
        note: String = "",
        sessions: [JournalSession] = [],
        photos: [PhotoAttachment] = [],
        personLinks: [EntryPersonTag] = [],
        details: [MemoryDetail] = []
    ) {
        self.id = id
        self.day = Calendar.current.startOfDay(for: day)
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.moodRawValue = mood.rawValue
        self.note = note
        self.sessions = sessions
        self.photos = photos
        self.personLinks = personLinks
        self.details = details
    }

    var mood: Mood {
        get { Mood(rawValue: moodRawValue) ?? .good }
        set {
            moodRawValue = newValue.rawValue
            updatedAt = .now
        }
    }

    var sortedSessions: [JournalSession] {
        (sessions ?? []).sorted { $0.createdAt < $1.createdAt }
    }

    var sortedPhotos: [PhotoAttachment] {
        (photos ?? []).sorted { $0.createdAt < $1.createdAt }
    }

    var sortedPersonTags: [PersonTag] {
        (personLinks ?? [])
            .compactMap(\.person)
            .sorted { lhs, rhs in
                if lhs.sortOrder == rhs.sortOrder {
                    return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
                }
                return lhs.sortOrder < rhs.sortOrder
            }
    }

    var sortedDetails: [MemoryDetail] {
        (details ?? []).sorted { lhs, rhs in
            if lhs.order == rhs.order {
                return lhs.createdAt < rhs.createdAt
            }
            return lhs.order < rhs.order
        }
    }

    var isComplete: Bool {
        EntryCompletion.isComplete(responseTexts: sortedSessions.flatMap(\.sortedResponses).map(\.text), photoCount: sortedPhotos.count)
    }
}

@Model
final class PersonTag: Identifiable {
    var id: UUID = UUID()
    var name: String = ""
    var colorHex: String = ""
    var sortOrder: Int = 0
    var isDefault: Bool = false
    var createdAt: Date = Date()
    var updatedAt: Date = Date()

    @Relationship(deleteRule: .cascade, inverse: \EntryPersonTag.person) var entryLinks: [EntryPersonTag]? = []
    @Relationship(deleteRule: .cascade, inverse: \DetailPersonTag.person) var detailLinks: [DetailPersonTag]? = []

    init(
        id: UUID = UUID(),
        name: String,
        colorHex: String = "#7C6F64",
        sortOrder: Int = 0,
        isDefault: Bool = false,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        entryLinks: [EntryPersonTag] = [],
        detailLinks: [DetailPersonTag] = []
    ) {
        self.id = id
        self.name = name
        self.colorHex = colorHex
        self.sortOrder = sortOrder
        self.isDefault = isDefault
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.entryLinks = entryLinks
        self.detailLinks = detailLinks
    }
}

@Model
final class EntryPersonTag: Identifiable {
    var id: UUID = UUID()
    var createdAt: Date = Date()
    var entry: JournalEntry?
    var person: PersonTag?

    init(
        id: UUID = UUID(),
        createdAt: Date = .now,
        entry: JournalEntry? = nil,
        person: PersonTag? = nil
    ) {
        self.id = id
        self.createdAt = createdAt
        self.entry = entry
        self.person = person
    }
}

@Model
final class MemoryDetail: Identifiable {
    var id: UUID = UUID()
    var text: String = ""
    var order: Int = 0
    var createdAt: Date = Date()
    var updatedAt: Date = Date()
    var entry: JournalEntry?

    @Relationship(deleteRule: .cascade, inverse: \DetailPersonTag.detail) var personLinks: [DetailPersonTag]? = []

    init(
        id: UUID = UUID(),
        text: String,
        order: Int = 0,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        entry: JournalEntry? = nil,
        personLinks: [DetailPersonTag] = []
    ) {
        self.id = id
        self.text = text
        self.order = order
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.entry = entry
        self.personLinks = personLinks
    }

    var sortedPersonTags: [PersonTag] {
        (personLinks ?? [])
            .compactMap(\.person)
            .sorted { lhs, rhs in
                if lhs.sortOrder == rhs.sortOrder {
                    return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
                }
                return lhs.sortOrder < rhs.sortOrder
            }
    }
}

@Model
final class DetailPersonTag: Identifiable {
    var id: UUID = UUID()
    var createdAt: Date = Date()
    var detail: MemoryDetail?
    var person: PersonTag?

    init(
        id: UUID = UUID(),
        createdAt: Date = .now,
        detail: MemoryDetail? = nil,
        person: PersonTag? = nil
    ) {
        self.id = id
        self.createdAt = createdAt
        self.detail = detail
        self.person = person
    }
}

@Model
final class JournalSession: Identifiable {
    var id: UUID = UUID()
    var kindRawValue: String = SessionKind.evening.rawValue
    var createdAt: Date = Date()
    var updatedAt: Date = Date()
    var entry: JournalEntry?

    @Relationship(deleteRule: .cascade, inverse: \PromptResponse.session) var responses: [PromptResponse]? = []

    init(
        id: UUID = UUID(),
        kind: SessionKind = .evening,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        responses: [PromptResponse] = []
    ) {
        self.id = id
        self.kindRawValue = kind.rawValue
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.responses = responses
    }

    var kind: SessionKind {
        get { SessionKind(rawValue: kindRawValue) ?? .evening }
        set {
            kindRawValue = newValue.rawValue
            updatedAt = .now
        }
    }

    var sortedResponses: [PromptResponse] {
        (responses ?? []).sorted { $0.promptOrder < $1.promptOrder }
    }
}

@Model
final class PromptTemplate: Identifiable {
    var id: UUID = UUID()
    var title: String = ""
    var prompt: String = ""
    var order: Int = 0
    var isEnabled: Bool = true
    var isDefault: Bool = false
    var createdAt: Date = Date()

    init(
        id: UUID = UUID(),
        title: String,
        prompt: String,
        order: Int,
        isEnabled: Bool = true,
        isDefault: Bool = false,
        createdAt: Date = .now
    ) {
        self.id = id
        self.title = title
        self.prompt = prompt
        self.order = order
        self.isEnabled = isEnabled
        self.isDefault = isDefault
        self.createdAt = createdAt
    }
}

@Model
final class PromptResponse: Identifiable {
    var id: UUID = UUID()
    var promptID: UUID = UUID()
    var promptTitle: String = ""
    var promptText: String = ""
    var promptOrder: Int = 0
    var text: String = ""
    var createdAt: Date = Date()
    var updatedAt: Date = Date()
    var session: JournalSession?

    init(
        id: UUID = UUID(),
        promptID: UUID,
        promptTitle: String,
        promptText: String,
        promptOrder: Int,
        text: String = "",
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.promptID = promptID
        self.promptTitle = promptTitle
        self.promptText = promptText
        self.promptOrder = promptOrder
        self.text = text
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

@Model
final class PhotoAttachment: Identifiable {
    var id: UUID = UUID()
    var originalFilename: String = ""
    var thumbnailFilename: String = ""
    var localIdentifier: String?
    var createdAt: Date = Date()
    var caption: String = ""
    var entry: JournalEntry?

    init(
        id: UUID = UUID(),
        originalFilename: String,
        thumbnailFilename: String,
        localIdentifier: String? = nil,
        createdAt: Date = .now,
        caption: String = ""
    ) {
        self.id = id
        self.originalFilename = originalFilename
        self.thumbnailFilename = thumbnailFilename
        self.localIdentifier = localIdentifier
        self.createdAt = createdAt
        self.caption = caption
    }
}

@Model
final class ReminderConfig: Identifiable {
    var id: UUID = UUID()
    var cadenceRawValue: String = RitualCadence.evening.rawValue
    var eveningHour: Int = 21
    var eveningMinute: Int = 0
    var morningHour: Int = 8
    var morningMinute: Int = 30
    var isEnabled: Bool = true

    init(
        id: UUID = UUID(),
        cadence: RitualCadence = .evening,
        eveningHour: Int = 21,
        eveningMinute: Int = 0,
        morningHour: Int = 8,
        morningMinute: Int = 30,
        isEnabled: Bool = true
    ) {
        self.id = id
        self.cadenceRawValue = cadence.rawValue
        self.eveningHour = eveningHour
        self.eveningMinute = eveningMinute
        self.morningHour = morningHour
        self.morningMinute = morningMinute
        self.isEnabled = isEnabled
    }

    var cadence: RitualCadence {
        get { RitualCadence(rawValue: cadenceRawValue) ?? .evening }
        set { cadenceRawValue = newValue.rawValue }
    }
}
