# Goal: Working Beta Roadmap

## Objective

Upgrade the current TestFlight prototype into a stronger working beta for owner/spouse testing. The beta should feel coherent on first launch, reliable for daily capture, and useful enough to validate the emotional product loop across several days.

## Beta Product Promise

The beta should let a tester:

- Understand the app on first launch.
- Understand the product promise from the public web homepage before entering the beta app.
- Create today's photo-led gratitude entry.
- Add, preview, and remove photos.
- Write three nice things and optional secondary prompts.
- Add private people tags.
- Add Little Details and tag each detail to one or more people.
- Browse Memories by person, text, and photo/text state.
- Open Entry Detail and understand what was saved.
- Use Calendar and Memory Lane without dead ends.
- Adjust basic prompts, reminders, cadence, privacy, export, and feedback settings.

## Scope For This Goal

### In Scope

- Photo management polish: preview, deletion, better import state, clearer 1-2 photo guidance.
- First-launch onboarding: simple value explanation, cadence choice, reminder opt-in, privacy/iCloud language.
- Prompt and cadence polish: better prompt editing/reorder where practical, reminder times, support beta cadence choices in UI and new-entry session creation.
- Memories and search polish: person filter, lightweight search, photo/text filter, Little Details discoverability.
- Beta hardening: better empty states, Settings feedback, QA docs, versioning, local tests where practical.
- Public web first impression: root homepage for private beta testers, with evidence-informed positioning, privacy copy, and CTA routing into `/app`.

### Out Of Scope

- Production App Store submission.
- Full StoreKit purchase implementation.
- Widgets.
- Final app icon/marketing screenshots.
- External tester program setup.
- Custom backend or account system.
- AI features.

## Implementation Tracks

### Track A: Photo Management

- Improve photo strip affordances.
- Add full-screen or sheet photo preview.
- Add remove-photo action.
- Add import failure feedback.
- Keep photos optional and 1-2 photo guidance gentle.

### Track B: Onboarding, Settings, Cadence

- Add first-launch onboarding gate before Today.
- Allow cadence choice during onboarding.
- Offer local reminder opt-in without forcing permission.
- Improve Settings controls for reminder time, cadence, beta feedback, privacy, and prompt access.
- Keep onboarding skippable and calm.

### Track C: Memories, Search, Entry Detail

- Add search/filter controls to Memories.
- Make person filters include Little Details.
- Add photo/text state filters if simple.
- Improve Entry Detail readability for photo-heavy, text-only, people, and Little Details entries.
- Improve empty and low-data states.

### Track D: Hardening, Tests, Docs

- Add focused tests for cadence-aware entry creation, photo removal, and new pure logic.
- Update beta QA docs and roadmap.
- Add manual migration/sync notes.
- Keep CI green.
- Avoid broad refactors.

## Acceptance Criteria

- GitHub Actions iOS CI passes.
- App launches to onboarding for a new beta install and then Today.
- Web root `/` presents the science-backed private-beta homepage and routes testers into `/app`.
- A tester can create an entry with photo, text, people tags, and Little Details.
- A tester can preview and remove photos.
- A tester can find memories by person and search text.
- Entry Detail clearly shows saved content.
- Settings has obvious feedback and beta controls.
- TestFlight and QA docs match the implemented beta scope.

## Risk Controls

- Keep changes local-first and CloudKit-compatible.
- Do not make core journaling dependent on Premium.
- Do not make child/family features mandatory or dominant.
- Do not add fragile dependencies.
- Prefer small SwiftUI components and existing project style.
