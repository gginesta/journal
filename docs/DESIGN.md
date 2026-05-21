# Design Direction

## Ownership

Codex can own the UX/UI direction, design system, interaction model, and implementation. The user should help with taste calibration at review points: visual direction, emotional tone, icon direction, and whether the app feels like the intended habit.

## Design Goal

The app should feel like opening a private, warm photo album at the end of the day. It should not feel like a productivity dashboard, social feed, or clinical tracker.

## Experience Attributes

- Calm.
- Warm.
- Photo-first.
- Native.
- Private.
- Lightly premium.
- Emotionally optimistic.
- Low guilt.
- Family-memory friendly.
- Flexible enough for self-reflection and personal milestones.

## Visual Direction

- Use photos as the main visual material.
- Keep backgrounds quiet and warm.
- Use restrained accent colors: rose, leaf green, dawn coral, warm gray, and ink.
- Avoid heavy gradients, decorative blobs, or overly playful illustration.
- Prefer native iOS controls where they communicate clearly.
- Cards should be used for meaningful content units, not nested layout decoration.
- Typography should be readable and calm, with larger expressive titles only where the screen has room.

## Information Architecture

Recommended v1 tabs:

- Today: daily ritual and Memory Lane.
- Memories: photo-first feed of past entries.
- Calendar: structured date browsing.
- Insights: streaks, trends, and Premium reflections.
- Settings: prompts, cadence, privacy, export, and subscription.

The existing Timeline tab should become Memories during the design pass.

## Screen Requirements

### Today

- Date and streak are visible but secondary.
- Photo slot is the hero element.
- "Three nice things" is a friendly list-style input.
- Secondary prompts are lower priority and can be compact.
- Mood picker should not compete with the photo or main prompt.
- People tagging should sit near the photo area as optional chips, not as a required form.
- Little Details should feel like an optional memory helper, not a parenting-only tracker.
- Completion should feel saved and reassuring, not like a chore checklist.
- Memory Lane appears as a signature moment after the daily entry area.

### Memories

- Photo grid or feed leads the experience.
- Person filters should make it easy to browse memories by each child.
- People chips should feel like private labels, not social tags.
- Little Details should surface as short, warm snippets in entry detail and future search.
- Text excerpts are short.
- Tapping opens the full entry.
- Empty state should encourage today's first photo.

### Calendar

- Month grid must be scannable.
- Completion and photo indicators should be clear but subtle.
- Day detail should feel like browsing memories, not database records.

### Insights

- Metrics should feel encouraging.
- Avoid punitive language for missed days.
- Premium content should be visible enough to understand value without cluttering the free experience.

### Settings

- Settings should be plain, predictable, and trustworthy.
- Privacy, export, and deletion must be easy to find.
- Premium should not interrupt critical privacy/data controls.

## Component System

Build or refine these reusable components:

- `JournalScreen`
- `PhotoHero`
- `PhotoPickerSlot`
- `PromptListInput`
- `PromptResponseEditor`
- `MemoryCard`
- `StreakPill`
- `MoodSelector`
- `PeopleTagPicker`
- `PersonFilterChips`
- `LittleDetailsEditor`
- `LittleDetailsSummary`
- `CompletionBanner`
- `CalendarMonthGrid`
- `EntryPreviewCard`
- `PremiumFeatureRow`
- `EmptyJournalState`

## Interaction Details

- Saving should be automatic.
- Photo import should show progress and failure states.
- Prompt editing should preserve historical prompt text.
- People tags should be editable after the entry is saved.
- Person filters should preserve the photo-first archive layout.
- Little Details should support neutral categories such as phrase, favorite, routine, milestone, and quote.
- Little Details should offer lightweight per-detail person chips so one entry can contain details about Me, each child, partner, or family.
- Memory cards should use exact labels when exact and softer labels when near dates, such as "Around this day in 2025."
- Reminder setup should be optional and reversible.

## Accessibility

- Support Dynamic Type.
- Maintain high text contrast.
- Add useful VoiceOver labels for photos, mood buttons, completion state, and calendar days.
- Add useful VoiceOver labels for selected people tags and person filters.
- Little Details fields should have clear labels that make sense outside a family context.
- Hit targets should be at least 44 by 44 points.
- Do not communicate state through color only.

## Design Review Milestones

- Review 1: static Today screen direction with empty, active, and completed states.
- Review 2: Memories and Calendar browsing flow.
- Review 3: onboarding, settings, and Premium surfaces.
- Review 4: full app pass on simulator screenshots before v1 launch candidate.
