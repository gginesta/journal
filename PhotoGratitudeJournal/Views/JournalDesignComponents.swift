import SwiftUI

struct JournalScreen<Content: View>: View {
    let title: String
    let subtitle: String?
    private let content: Content

    init(
        title: String,
        subtitle: String? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.subtitle = subtitle
        self.content = content()
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: JournalTheme.Layout.sectionSpacing) {
                VStack(alignment: .leading, spacing: JournalTheme.Spacing.xSmall) {
                    if let subtitle {
                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundStyle(.warmGray)
                    }

                    Text(title)
                        .font(.largeTitle.weight(.bold))
                        .foregroundStyle(.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                content
            }
            .padding(.horizontal, JournalTheme.Layout.horizontalPadding)
            .padding(.vertical, JournalTheme.Spacing.large)
        }
        .scrollIndicators(.hidden)
        .background(Color.journalBackground.ignoresSafeArea())
    }
}

struct JournalSection<Content: View>: View {
    let title: String
    let systemImage: String?
    private let content: Content

    init(
        _ title: String,
        systemImage: String? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.systemImage = systemImage
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: JournalTheme.Spacing.medium) {
            HStack(spacing: JournalTheme.Spacing.small) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .foregroundStyle(.rose)
                        .accessibilityHidden(true)
                }

                Text(title)
                    .font(.headline)
                    .foregroundStyle(.ink)

                Spacer(minLength: 0)
            }

            content
        }
        .journalSurface()
    }
}

struct StreakPill: View {
    let days: Int
    var label: String = "days kept"
    var isActive: Bool = true

    // "N days kept" stays warm-gray and secondary in every state — never rose,
    // and a missed day never changes the styling or the copy.
    var body: some View {
        Label {
            Text(text)
                .lineLimit(1)
                .minimumScaleFactor(0.82)
        } icon: {
            Image(systemName: "sparkles")
                .accessibilityHidden(true)
        }
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(Color.warmGray)
        .padding(.horizontal, 12)
        .frame(minHeight: JournalTheme.Layout.minimumTapTarget)
        .background(Color.warmGray.opacity(0.12), in: Capsule())
        .accessibilityLabel(text)
    }

    private var text: String {
        days == 1 ? "1 day kept" : "\(days) \(label)"
    }
}

struct CompletionBanner: View {
    let isComplete: Bool
    var completeTitle: String = "Saved to your story"
    var incompleteTitle: String = "Open for today"
    var completeMessage: String = "Your moment is tucked away."
    var incompleteMessage: String = "A photo or a few words is enough."

    var body: some View {
        HStack(alignment: .top, spacing: JournalTheme.Spacing.medium) {
            Image(systemName: isComplete ? "checkmark.circle.fill" : "circle.dotted")
                .font(.title3.weight(.semibold))
                .foregroundStyle(isComplete ? Color.leaf : Color.rose)
                .frame(width: JournalTheme.Layout.minimumTapTarget, height: JournalTheme.Layout.minimumTapTarget)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text(isComplete ? completeTitle : incompleteTitle)
                    .font(.headline)
                    .foregroundStyle(.ink)
                Text(isComplete ? completeMessage : incompleteMessage)
                    .font(.subheadline)
                    .foregroundStyle(.warmGray)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .padding(JournalTheme.Spacing.medium)
        .background((isComplete ? Color.leaf : Color.dawn).opacity(0.13), in: RoundedRectangle(cornerRadius: JournalTheme.Radius.medium, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

struct EmptyJournalState: View {
    let title: String
    let message: String
    var systemImage: String = "photo.on.rectangle"
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: JournalTheme.Spacing.medium) {
            Image(systemName: systemImage)
                .font(.system(size: 36, weight: .semibold))
                .foregroundStyle(.rose)
                .frame(width: 56, height: 56)
                .background(Color.rose.opacity(0.12), in: Circle())
                .accessibilityHidden(true)

            VStack(spacing: JournalTheme.Spacing.xSmall) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(.ink)
                    .multilineTextAlignment(.center)

                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.warmGray)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if let actionTitle, let action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(.subheadline.weight(.semibold))
                        .frame(minHeight: JournalTheme.Layout.minimumTapTarget)
                        .padding(.horizontal, JournalTheme.Spacing.large)
                }
                .buttonStyle(.borderedProminent)
                .tint(.rose)
            }
        }
        .frame(maxWidth: .infinity)
        .journalSurface(padding: JournalTheme.Spacing.xLarge)
        .accessibilityElement(children: .combine)
    }
}

struct PhotoHero: View {
    let imageURL: URL?
    var title: String = "Photo of the day"
    var subtitle: String = "Let one good moment lead."
    var accessibilityLabel: String = "Journal photo"

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            photoContent
                .aspectRatio(JournalTheme.Layout.photoHeroAspectRatio, contentMode: .fit)
                .frame(maxWidth: .infinity)
                .journalPhotoShape()

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.88))
            }
            .padding(JournalTheme.Spacing.large)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                LinearGradient(
                    colors: [.black.opacity(0.0), .black.opacity(0.52)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .clipShape(RoundedRectangle(cornerRadius: JournalTheme.Radius.hero, style: .continuous))
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityLabel)
    }

    @ViewBuilder
    private var photoContent: some View {
        if let imageURL {
            AsyncImage(url: imageURL) { phase in
                switch phase {
                case .empty:
                    PhotoPlaceholder()
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure:
                    PhotoPlaceholder(systemImage: "exclamationmark.triangle")
                @unknown default:
                    PhotoPlaceholder()
                }
            }
        } else {
            PhotoPlaceholder()
        }
    }
}

struct PhotoPickerSlot: View {
    var title: String = "Add a photo"
    var subtitle: String = "One or two is plenty."
    var systemImage: String = "photo.badge.plus"
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: JournalTheme.Spacing.medium) {
                Image(systemName: systemImage)
                    .font(.title3.weight(.semibold))
                    .frame(width: JournalTheme.Layout.minimumTapTarget, height: JournalTheme.Layout.minimumTapTarget)
                    .background(Color.rose.opacity(0.12), in: Circle())
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(.ink)
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.warmGray)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
                    .accessibilityHidden(true)
            }
            .padding(JournalTheme.Spacing.medium)
            .frame(maxWidth: .infinity, minHeight: 74, alignment: .leading)
            .background(Color.journalSurfaceRaised, in: RoundedRectangle(cornerRadius: JournalTheme.Radius.medium, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: JournalTheme.Radius.medium, style: .continuous)
                    .stroke(Color.rose.opacity(0.18), style: StrokeStyle(lineWidth: 1, dash: [6, 5]))
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
        .accessibilityHint(subtitle)
    }
}

struct MemoryCard: View {
    let title: String
    let date: Date
    var subtitle: String?
    var excerpt: String?
    var photoURL: URL?
    var isExactDate: Bool = true
    var action: (() -> Void)?

    var body: some View {
        Group {
            if let action {
                Button(action: action) {
                    cardBody
                }
                .buttonStyle(.plain)
            } else {
                cardBody
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    private var cardBody: some View {
        VStack(alignment: .leading, spacing: JournalTheme.Spacing.medium) {
            ZStack(alignment: .bottomLeading) {
                photoContent
                    .aspectRatio(JournalTheme.Layout.memoryCardAspectRatio, contentMode: .fit)
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: JournalTheme.Radius.medium, style: .continuous))

                Text(isExactDate ? "On this day" : "Around this day")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, JournalTheme.Spacing.small)
                    .padding(.vertical, JournalTheme.Spacing.xSmall)
                    .background(.black.opacity(0.42), in: Capsule())
                    .padding(JournalTheme.Spacing.small)
            }

            VStack(alignment: .leading, spacing: JournalTheme.Spacing.xSmall) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(.ink)
                    .fixedSize(horizontal: false, vertical: true)

                Text(subtitle ?? date.formatted(date: .abbreviated, time: .omitted))
                    .font(.subheadline)
                    .foregroundStyle(.warmGray)

                if let excerpt, !excerpt.isEmpty {
                    Text(excerpt)
                        .font(.subheadline)
                        .foregroundStyle(.softInk)
                        .lineLimit(3)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .journalSurface(padding: JournalTheme.Spacing.small, cornerRadius: JournalTheme.Radius.large)
    }

    @ViewBuilder
    private var photoContent: some View {
        if let photoURL {
            AsyncImage(url: photoURL) { phase in
                switch phase {
                case .empty:
                    PhotoPlaceholder()
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure:
                    PhotoPlaceholder(systemImage: "photo")
                @unknown default:
                    PhotoPlaceholder()
                }
            }
        } else {
            PhotoPlaceholder(systemImage: "photo.on.rectangle")
        }
    }

    private var accessibilityText: String {
        let prefix = isExactDate ? "On this day" : "Around this day"
        return "\(prefix), \(title), \(date.formatted(date: .long, time: .omitted))"
    }
}

private struct PhotoPlaceholder: View {
    var systemImage: String = "photo"

    var body: some View {
        Rectangle()
            .fill(Color.mist)
            .overlay {
                Image(systemName: systemImage)
                    .font(.system(size: 34, weight: .semibold))
                    .foregroundStyle(.warmGray)
                    .accessibilityHidden(true)
            }
    }
}
