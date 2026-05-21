# Product Requirements Document

## Product Summary

Photo Gratitude Journal is a private, photo-first iOS journal that helps users end the day by noticing what was good. The core loop is intentionally small: add one or two photos, write a few nice things from the day, and revisit past moments through Memory Lane.

The app is inspired by the emotional utility of Five Minute Journal, but the product center is the user's own photos rather than a text-only habit checklist.

## Product Principles

- Photos are the emotional anchor.
- Journaling should feel gentle, not like homework.
- The app should reward noticing ordinary good moments.
- Privacy is a product feature, not a settings afterthought.
- Core journaling stays free.
- Premium should deepen nostalgia and reflection, not hold memories hostage.
- The interface should feel calm, warm, and Apple-native.

## Target Users

- People who want a low-friction gratitude habit.
- People who take daily photos but rarely revisit them meaningfully.
- People who want a private journal without social posting or public sharing.
- People who respond better to visual memory than long-form writing.
- People who want a positive end-of-day ritual without a complex mental health app.
- Parents or family members who want to revisit memories for each child without creating a social album.

## Core Jobs To Be Done

- At the end of the day, I want to quickly capture a photo and a few good moments so I can feel grounded before bed.
- When I open the app, I want to see what I was doing around this time in the past so I can appreciate the shape of my life.
- When I miss a day, I want the app to gently invite me back without making me feel guilty.
- When I customize prompts, I want the journal to feel like mine.
- When I add personal memories, I want confidence that they stay private.
- When I tag my kids in memories, I want to quickly see each child's story over time.

## Scope

### In Scope For v1

- iPhone-only SwiftUI app.
- Local-first SwiftData persistence.
- iCloud private database sync.
- Daily photo-led entry creation.
- Editable prompt templates.
- Cadence options: evening, once daily, morning/evening, anytime.
- Calendar view.
- Memories/Timeline view.
- Private people tagging for entries and photos.
- Person filters in Memories and search/browse surfaces.
- Streak and completion summaries.
- Automatic Memory Lane for 1 month, 1 year, 2 years, and 3 years ago.
- Local reminders.
- Face ID/passcode app lock.
- Yearly Premium scaffolding and entitlement gates.
- JSON export.
- WidgetKit extension for Premium users.

### Out Of Scope For v1

- Android or web app.
- Custom account system.
- Social sharing feed.
- Public profiles.
- AI-generated journaling advice.
- Therapist or clinical mental health positioning.
- Collaborative journals.
- Remote push notifications.

## User Experience

### First Launch

- Explain the product in one calm screen: a photo journal for noticing good moments.
- Ask for preferred ritual cadence.
- Ask whether to enable reminders.
- Seed default prompts.
- Land on Today.

### Daily Entry

- Today opens to the current day.
- The photo area is visually dominant.
- The default entry asks: "What are 3 nice things that happened today?"
- Users can type one item, three items, or a longer free-form response.
- Users can add one or two photos, but an entry can be completed without photos.
- Users can optionally tag people, such as kids or family members, on the entry or individual photos.
- Users can optionally answer secondary prompts.
- Users can select a mood.
- A day is complete when it has at least one non-empty response or at least one photo.

### Prompt Customization

- Users can edit default prompts.
- Users can add custom prompts.
- Users can disable prompts.
- Users can reorder prompts before v1 launch.
- Prompt edits affect future entries only; historical entries preserve the prompt text used at the time.

### Memory Lane

- Today shows matching memories from 1 month, 1 year, 2 years, and 3 years ago when available.
- If an exact date is unavailable, the app may show the closest entry within plus or minus 3 days.
- Memory cards should prioritize photos and date context.
- Tapping a memory opens the entry detail.
- Premium unlocks richer seasonal browsing and proactive look-back notifications.

### Calendar

- Month grid shows which days have entries.
- Days with photos have a photo indicator.
- Complete days have a completion indicator.
- Tapping a day opens the entry if one exists.

### Memories

- The Memories tab is photo-first.
- Users can filter memories by private people tags.
- Text is secondary and should be revealed through entry detail or compact previews.
- Empty states should encourage adding today's first photo.

### People Tags

- People tags are private labels created by the user, not contacts, accounts, or shared profiles.
- Tags can represent children, family members, friends, pets, or other recurring memory subjects.
- Users can add tags during daily entry creation and edit tags from entry detail.
- A memory can have multiple people tags.
- Photo-level tags may be supported when one entry has multiple photos with different people.
- Memories should provide a simple person filter so users can browse "all memories with Kid 1" or similar.
- Person tagging belongs in the free core product because it helps users retrieve their own memories.

### Insights

- Free users see current streak, longest streak, and completed days.
- Premium users see mood trends, seasonal recaps, and deeper nostalgia.
- Insights should avoid guilt framing.

### Settings

- Users can change cadence.
- Users can enable or disable reminders.
- Users can edit prompts.
- Users can manage app lock.
- Users can export data.
- Users can delete all entries.
- Users can view Premium status.

## Monetization

### Free

- Daily journaling.
- Editable prompts.
- Local + iCloud sync.
- Basic calendar.
- Basic streaks.
- Basic Memory Lane.

### Yearly Premium

- App lock.
- Widgets.
- Advanced insights.
- Expanded nostalgia views.
- Look-back notifications.
- Themes.
- Export polish.
- Custom prompt sets.

Premium should feel like a richer habit layer, not a ransom on personal memories.

## Privacy And Data

- No custom backend for v1.
- Journal data syncs only through the user's private iCloud database.
- Photos are copied into the app container and referenced by filename.
- People tags are user-authored private metadata and should sync only through the private iCloud database.
- Sensitive files should use iOS file protection where available.
- App lock uses LocalAuthentication.
- Export should be user-initiated.
- Delete-all should remove local entries and associated photo files.

## Success Metrics

- First entry completion rate.
- Seven-day retention.
- Percentage of days with at least one photo.
- Reminder opt-in rate.
- Memory Lane tap-through rate.
- Prompt customization rate.
- People tag creation and tagged-memory revisit rate.
- Premium conversion rate after users have created meaningful history.

## Non-Goals

- Maximize daily screen time.
- Build a social network.
- Push users into long writing sessions.
- Replace therapy or medical care.
- Add complex productivity tracking.

## Open Product Decisions

- Final app name.
- Final visual identity and app icon direction.
- Whether app lock is Premium-only or included free for trust.
- Exact free export limitations, if any.
- Whether mood tracking should be prominent or quiet.
- Whether first launch should require reminder setup or defer it.
- Whether people tags should be entry-level first, photo-level first, or both from v1.
