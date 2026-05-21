# Goal: TestFlight Prototype Beta

## Objective

Turn the current photo-first SwiftUI prototype into a TestFlight-ready iPhone beta that can be installed and tested by the owner and spouse.

## Product Scope

The beta should validate the core private memory loop:

- Create today's photo-led gratitude entry.
- Add one or two photos.
- Write three nice things or leave text light.
- Add optional private people tags such as Me, child, partner, family, or custom people.
- Add optional Little Details and tag each detail to one or more people.
- Browse Memories with photo-first cards and person filters.
- Open entry detail and see photos, prompts, people, and Little Details.
- Browse Calendar and Memory Lane.
- Keep all content local-first with private iCloud-ready SwiftData storage.

## Beta Constraints

- iPhone only.
- iOS 17+.
- Local-first; no custom account backend.
- CloudKit private database compatible SwiftData schema.
- Core memory capture, people tags, and Little Details are free.
- Premium surfaces can remain scaffolded, but must not block beta testing.
- TestFlight readiness means the branch builds, tests pass in CI, versioning is clear, and docs include an owner checklist for Apple Developer/TestFlight setup.

## Implementation Tracks

### Data And Logic

- Add SwiftData models for `PersonTag`, entry-to-person links, `MemoryDetail`, and detail-to-person links.
- Keep relationships CloudKit-compatible: optional to-many relationships and explicit inverses.
- Seed default people tags for beta: Me, Kid 1, Kid 2, Partner, Family.
- Add service helpers for adding/removing people tags and Little Details.
- Add unit tests for tag assignment, Little Details assignment, and filtering.

### SwiftUI UX

- Add people tag chips to Today.
- Add Little Details editor with per-detail people chips.
- Add person filters to Memories.
- Add people and Little Details sections to Entry Detail.
- Keep the daily entry flow optional, calm, and not child-only.

### Beta Readiness

- Add a TestFlight readiness checklist.
- Clarify bundle id, version, build number, signing, iCloud container, StoreKit/Premium caveats, and tester steps.
- Add a manual QA checklist for the owner and spouse.
- Ensure CI remains green.

## Acceptance Criteria

- CI passes on the branch.
- The app compiles on macOS GitHub Actions.
- Unit tests cover new pure logic where practical.
- Today supports creating/editing entry people tags and Little Details.
- Little Details can be tagged to Me, each child, partner, family, or custom tags.
- Memories can filter entries by person tag.
- Entry detail shows associated people and Little Details.
- Docs explain how to prepare the TestFlight build.

## Non-Goals For This Goal

- App Store submission.
- Production StoreKit product validation.
- Widgets.
- Final app icon and marketing screenshots.
- AI features.
- Android or web app.
