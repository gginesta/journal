# Roadmap

This roadmap is the execution plan for turning the current scaffold into a production-ready Guided Gratitude Memory System across web and iOS. The active beta path is the web/Supabase app because it can support private household testing immediately; the iOS app remains the Apple-native product path. Each milestone should land through a focused branch and commit set. `main` should remain stable and reviewable.

Current beta-readiness docs:

- Working beta goal: `docs/GOAL_WORKING_BETA_ROADMAP.md`.
- Web beta operations: `docs/WEB_APP.md`.
- TestFlight owner setup: `docs/TESTFLIGHT.md`.
- Manual beta QA: `docs/QA_TESTFLIGHT.md`.

## Milestone 0.2.5 - Web Private Beta Prototype

Status: complete for private beta testing; Supabase and Vercel are live for the first household testers.

Goal: make a polished browser version that can be tested on Windows, iPad browser, and iPhone browser while the native iOS distribution path is being resolved.

Delivered:

- Next.js App Router app under `web/` with TypeScript, Tailwind, PWA manifest, and responsive desktop/mobile navigation.
- Demo mode with browser-local persistence for PC UX review.
- Supabase schema migration with workspace-based tables, private Storage buckets, RLS policies, owner/editor/viewer roles, and last-owner protection.
- Today flow with photo-first capture, compressed local previews, one-or-two photo guidance, three nice things, secondary prompts, mood, people tags, and Little Details.
- Little Detail categories for notes, phrases, favorites, routines, milestones, and quotes, with per-detail people tags.
- Memories search and filters across dates, prompt text, responses, people, and Little Details.
- Tappable Memory Lane, Memories cards, and Calendar days that open a full entry detail modal.
- Settings surfaces for workspaces, cadence/reminders, prompts, people tags, JSON export, delete controls, and sign out.
- Web CI for lint, typecheck, unit tests, and production build.
- Chromium E2E coverage for desktop and mobile demo journaling flow.
- Authenticated Supabase autosave route for people, prompts, reminders, entries, sessions, responses, tags, Little Details, and private photo Storage uploads.
- Server routes for creating workspaces through the secured database function and deleting workspace entries through RLS.
- Web first-run onboarding with a three-step product tour, balanced memory-focus choices, friendly name/tag collection for solo, partner, family, and custom use, starter checklist, and Settings replay control.
- Gratitude Guide foundations with curated non-AI prompt packs for small gratitude, savoring, appreciation, self-kindness, hard days, and family/relationships.
- Little Details repository foundations so tiny details can be searched and managed as first-class retrievable memories, not only as entry subfields.

Acceptance criteria:

- A tester can open `/app` in demo mode and create a text-only, photo-only, or mixed memory.
- A tester can complete onboarding for solo/self, family, and custom tags without the app feeling child-only.
- A tester can add private people tags and tag Little Details by person.
- A tester can use a Gratitude Guide starter and then edit the saved response.
- A tester can search Memories by a Little Detail or person and open a full memory page.
- A tester can search/filter the Little Details repository by text, category, and person/theme tag.
- Calendar and Memory Lane are entry points, not dead ends.
- Web build, lint, typecheck, unit tests, and Chromium E2E pass from a clean non-OneDrive workspace.
- In Supabase mode, server data is the source of truth; demo localStorage is not restored over authenticated data.

Remaining work:

- Verify RLS and shared household behavior with two real authenticated users.
- Add household invitation/member-management UI on top of `workspace_members`.
- Add more granular sync conflict handling for two people editing the same entry at the same time.
- Run the private beta verification checklist from `docs/WEB_APP.md` after both testers have logged in, including solo, family, custom, Gratitude Guide, Little Details repository, and owner/editor/viewer coverage.

## Milestone 0.2.6 - Consolidated Beta Verification

Status: in progress.

Goal: prove the consolidated Guided Gratitude Memory System works as a private beta before widening tester access.

Work:

- Keep PRD, roadmap, web operations, and QA docs aligned with the web/Supabase beta path.
- Verify onboarding does not privilege only family/kids use: solo/self, partner, family, and custom tags should all feel legitimate.
- Verify Gratitude Guide prompt packs are optional, editable, non-AI starters.
- Verify Little Details can be created from entry flow and repository flow, tagged by person/theme, searched, filtered, edited, and removed.
- Verify Supabase RLS, private Storage paths, workspace roles, and demo-vs-authenticated source-of-truth behavior.
- Expand Playwright coverage where selectors are stable; keep copy assertions limited to high-signal onboarding and repository landmarks.

Acceptance criteria:

- Docs describe current beta behavior and do not imply iCloud-only storage for the web beta.
- Manual QA has a dedicated web/Supabase beta pass and a separate TestFlight/native pass.
- E2E covers family/custom onboarding and Little Details retrieval without brittle marketing-copy dependence.
- Known blockers and in-progress implementation risks are recorded before inviting additional testers.

## Milestone 0.1.0 - Bootstrap

Status: complete.

Goal: establish the iOS project, core model layer, initial screens, documentation, and CI.

Delivered:

- SwiftUI iPhone app scaffold.
- SwiftData model layer with CloudKit-ready configuration.
- Today, Timeline, Calendar, Insights, Settings, Entry Detail, Prompt Editor, and Paywall screens.
- Photo import and thumbnail storage.
- Default prompts and custom prompt editing.
- Completion and streak logic.
- Basic Memory Lane.
- Reminder, privacy lock, Premium, export, and delete scaffolds.
- Unit tests for core logic.
- README, PRD, architecture, roadmap, versioning, contributing, changelog, and CI.

Acceptance criteria:

- Project opens in Xcode.
- GitHub remote is configured.
- `main` tracks `origin/main`.
- Documentation explains the product, architecture, and next milestones.

## Milestone 0.2.0 - Owner Working Beta

Goal: prepare the first owner/spouse TestFlight build with a coherent first-run experience and enough polish to test the daily photo gratitude loop for real.

Work:

- Run the GitHub Actions macOS CI workflow and keep it green.
- Confirm the app launches to onboarding and then Today on simulator.
- Add first-launch onboarding with cadence choice and optional reminders.
- Add photo preview, removal, import feedback, and gentle one-or-two photo guidance.
- Add Memories search and filters for people, photos, and text.
- Make person filters include Little Details tagged to that person.
- Improve Entry Detail readability for photo-heavy, text-only, people, and Little Details entries.
- Improve Calendar and Memory Lane low-data states.
- Keep TestFlight setup, QA docs, roadmap, changelog, Xcode marketing version, and build number aligned.

Acceptance criteria:

- `xcodebuild test` passes on macOS CI.
- App launches in an iPhone simulator and presents onboarding for a fresh install.
- A tester can add, preview, and remove photos.
- A tester can write prompt responses, add people tags, add Little Details, and tag details per person.
- A tester can search/filter Memories and open Entry Detail.
- Calendar and Memory Lane do not feel like dead ends with low data.
- No known compile-time blockers remain.
- `CHANGELOG.md`, Xcode marketing version, and build number reflect the `0.2.0 (2)` beta.

## Milestone 0.3.0 - Design System And Today Redesign

Goal: make the app feel like a polished, photo-first ritual instead of a functional scaffold.

Work:

- Rename Timeline to Memories.
- Add preview/demo fixtures for empty, first-entry, active-streak, and Memory Lane states.
- Create the first reusable design components:
  - `JournalScreen`
  - `PhotoHero`
  - `PhotoPickerSlot`
  - `PromptListInput`
  - `MemoryCard`
  - `StreakPill`
  - `MoodSelector`
  - `CompletionBanner`
- Redesign Today so the photo is the primary element.
- Convert "three nice things" into a list-style input.
- Move secondary prompts into lower-priority sections.
- Make completion language gentle and saved-state oriented.
- Add accessibility labels for core Today interactions.

Acceptance criteria:

- Today has empty, editing, completed, and Memory Lane states.
- Today supports Dynamic Type without obvious overlap.
- Text-only and photo-only entries still count as complete.
- Existing unit tests pass.
- Simulator screenshots are reviewed before merge.

## Milestone 0.4.0 - Entry Creation And Photo Management Polish

Goal: make daily capture reliable and delightful.

Work:

- Add photo preview.
- Add photo deletion.
- Add import loading and error states.
- Add captions or lightweight photo notes if they do not clutter the flow.
- Add optional Little Details for phrases, favorites, routines, tiny milestones, and quotes.
- Preserve historical prompt text when prompts change.
- Add support for multiple sessions based on cadence.
- Add Settings controls for reminder times.
- Improve autosave feedback.

Acceptance criteria:

- User can add, preview, and delete photos.
- User can add optional Little Details without making the daily flow feel required or child-only.
- User can tag each Little Detail to Me, one or more children, partner, family, or another private person tag.
- Failed photo imports are recoverable.
- Cadence changes create the expected session choices.
- Prompt edits affect future entries without mutating historical entries.
- UI tests cover first entry creation and photo import.

## Milestone 0.5.0 - Memories And Calendar Polish

Goal: make browsing past entries visually rewarding.

Work:

- Redesign Memories as a photo-first feed or grid.
- Add private people tags for children, family, and recurring memory subjects.
- Add person filters to Memories.
- Add entry-detail editing for people tags.
- Show Little Details in entry detail and make them discoverable in Memories or search.
- Improve Entry Detail as a memory page.
- Improve Calendar visual density and month navigation.
- Add "around this time" labels for near-date Memory Lane matches.
- Add empty and low-data states for calendar and memories.
- Add filters for photo entries and completed entries if they remain simple.

Acceptance criteria:

- Memories tab feels photo-led.
- User can tag a memory with one or more people.
- User can filter Memories by a selected person.
- People tags remain private local/iCloud metadata, not social contacts.
- User can revisit Little Details for a person or personal milestone.
- Person filters include Little Details tagged to that person, not only whole-entry tags.
- Calendar clearly distinguishes photo, complete, and empty days.
- Entry Detail renders photo-heavy and text-only entries well.
- Memory Lane cards open the correct entry.
- UI tests cover calendar navigation and memory opening.

## Milestone 0.6.0 - Onboarding, Reminders, And Settings

Goal: make setup clear and trustworthy.

Work:

- Add first-launch onboarding.
- Ask for cadence preference.
- Offer local reminder opt-in without forcing it.
- Explain iCloud private sync.
- Make prompt editing easier, including reorder.
- Improve privacy, export, and delete-all flows.
- Add Settings controls for notification authorization states.

Acceptance criteria:

- New user can complete onboarding and create an entry.
- Reminder permission denial is handled gracefully.
- Prompt reorder works.
- Export flow produces shareable JSON.
- Delete-all removes entries and local photo files.

## Milestone 0.7.0 - Premium Foundations

Goal: make the yearly Premium model testable and credible.

Work:

- Add StoreKit configuration for local testing.
- Configure yearly product copy and entitlement states.
- Gate app lock, advanced insights, themes, richer nostalgia, export polish, and widgets according to product policy.
- Add restore purchase success and error states.
- Add legal links placeholders.
- Decide whether app lock should be free for trust.

Acceptance criteria:

- StoreKit local purchase and restore flows work in simulator.
- Premium gates are consistent and documented.
- Free users keep core journaling, basic calendar, streaks, and basic Memory Lane.
- Premium copy is clear and not manipulative.

## Milestone 0.8.0 - Widgets And Look-Back Notifications

Goal: extend the ritual outside the app without exposing private data carelessly.

Work:

- Add WidgetKit extension.
- Add daily prompt widget.
- Add streak widget.
- Add Memory Lane widget.
- Add minimal app group payload for widget data.
- Add Premium look-back notification scheduling.
- Review privacy implications of widget content.

Acceptance criteria:

- Widgets render without needing full SwiftData access.
- Widget payload contains only intentionally shared summary data.
- Look-back notifications open the relevant entry.
- Premium gates apply correctly.

## Milestone 0.9.0 - Beta Hardening

Goal: prepare for TestFlight.

Work:

- Run CloudKit sync tests across two devices or simulators where possible.
- Add migration tests or manual migration checklist.
- Complete accessibility pass.
- Add crash and logging strategy.
- Add App Store privacy nutrition label draft.
- Add beta feedback workflow.
- Add screenshots for App Store draft.
- Keep `docs/TESTFLIGHT.md` and `docs/QA_TESTFLIGHT.md` current with the latest beta scope.

Acceptance criteria:

- TestFlight build is installable.
- No critical data loss bugs are known.
- Privacy posture is documented.
- App is usable with larger Dynamic Type.
- Core flows pass manual QA.

## Milestone 1.0.0 - Launch Candidate

Goal: ship a focused, polished v1.

Work:

- Finalize app name and icon.
- Finalize App Store metadata.
- Validate StoreKit production product.
- Validate CloudKit production container.
- Complete final visual QA.
- Complete final regression pass.
- Tag `v1.0.0`.

Acceptance criteria:

- CI passes.
- Manual QA checklist passes.
- App Store Connect configuration is complete.
- Release notes are written.
- `CHANGELOG.md`, Xcode marketing version, build number, and Git tag agree.
