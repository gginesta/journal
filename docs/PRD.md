# Product Requirements Document

## Product Summary

Photo Gratitude Journal is a private, photo-first Guided Gratitude Memory System that helps users end the day by noticing what was good and preserving the details they will want to find later. The current beta path is a Next.js/Supabase web app for private household testing, with the native iOS app remaining the long-term Apple-native expression of the same product.

The core loop is intentionally small: add one or two photos, write one or a few nice things from the day, optionally keep tiny details, and revisit past moments through Memory Lane, Memories, Calendar, and the Little Details repository.

The app is inspired by the emotional utility of Five Minute Journal, but the product center is the user's own photos rather than a text-only habit checklist.

The web beta also includes a public private-beta homepage at `/` that explains the product as an evidence-informed ritual. It may cite research on gratitude practice, savoring, intentional photo-taking, and reminiscence, but it must avoid clinical, therapeutic, diagnostic, or guaranteed mental-health claims.

## Current Beta Version

- Current web beta app version: `0.2.10`.
- The web package version is the app version source of truth and is visible in Settings > Beta for QA notes.
- Manual QA should record this version when testing household sharing, Supabase sync safety, and photo handling.

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
- People who want a guided gratitude habit that offers starters without turning reflection into homework.
- Parents or family members who want to revisit memories for each child without creating a social album.
- People who want to preserve tiny phases, personal milestones, favorite routines, or details they might otherwise forget.

## Core Jobs To Be Done

- At the end of the day, I want to quickly capture a photo and a few good moments so I can feel grounded before bed.
- When I open the app, I want to see what I was doing around this time in the past so I can appreciate the shape of my life.
- When I miss a day, I want the app to gently invite me back without making me feel guilty.
- When I customize prompts, I want the journal to feel like mine.
- When I add personal memories, I want confidence that they stay private.
- When I tag my kids in memories, I want to quickly see each child's story over time.
- When a phase is easy to miss, I want a lightweight place to capture tiny details like funny phrases, favorite snacks, routines, or personal milestones.
- When I am not journaling about kids or family, I want onboarding and tags to support solo memories, partner memories, friends, projects, places, and custom themes.
- When I do not know what to write, I want a Gratitude Guide to offer prompt packs that fit the mood of the day.

## Scope

### In Scope For Current Web/Supabase Beta

- Next.js web app deployable on Vercel.
- Public web homepage for private beta testers, with a demo/beta CTA into `/app`, careful research-backed positioning, and privacy-first product framing.
- Supabase Auth with email magic links.
- Supabase Postgres and private Storage for journal data and photos.
- Workspace-based personal and household journals.
- RLS-protected owner/editor/viewer access model.
- Shared household workspace verification for accepted members, viewer/editor role limits, and non-member denial.
- Daily photo-led entry creation with text-only, photo-only, and mixed entries.
- Photo add/remove polish for one or two photo memories, including photo-only completion.
- Balanced onboarding for solo, partner, family, and custom memory shapes.
- Private people/theme tags created during onboarding, entry editing, or Settings.
- Gratitude Guide prompt packs that suggest gentle starters without requiring AI.
- Editable prompt templates for the workspace.
- Optional Little Details on entries and from the repository flow.
- Little Details repository with search/filter by text, category, date, and person/theme tag.
- Memories, Calendar, Memory Lane, Insights, Settings, JSON export, and delete controls.
- Demo mode with browser-local persistence for UX review.
- Sync-safety checks that authenticated Supabase data remains authoritative over demo localStorage.
- Beta verification checklist for homepage routing, solo, family, custom, shared workspace, RLS, and Storage behavior.

### In Scope For Native v1

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
- Optional Little Details section for tiny phases, quotes, favorites, routines, and milestones.
- Gratitude Guide prompt packs or equivalent guided starters.
- Streak and completion summaries.
- Progressive Memory Lane for early look-backs such as yesterday, 3 days ago, 1 week ago, 2 weeks ago, 1 month ago, 3 months ago, 6 months ago, and yearly anniversaries.
- Local reminders.
- Face ID/passcode app lock.
- Yearly Premium scaffolding and entitlement gates.
- JSON export.
- WidgetKit extension for Premium users.

### Out Of Scope For Current Beta

- Android app.
- Social sharing feed.
- Public profiles.
- AI-generated journaling advice or clinical interpretation.
- Clinical or medical claims on the homepage or in onboarding.
- Therapist or clinical mental health positioning.
- Open self-serve collaboration beyond invited private beta testers.
- Remote push notifications.
- Stripe/Premium billing enforcement.

## User Experience

### First Launch / Onboarding

- Explain the product in one calm screen: a photo journal for noticing good moments.
- Ask what shape the journal starts with: solo/self, partner, family, or custom people/themes.
- Let users personalize private tags without making child/family use feel mandatory.
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
- Users can optionally add Little Details, such as a funny phrase, current favorite, small milestone, routine, or memorable quote.
- Users can use Gratitude Guide suggestions from curated prompt packs when they are unsure what to write.
- Users can optionally answer secondary prompts.
- Users can select a mood.
- A day is complete when it has at least one non-empty response or at least one photo.

### Prompt Customization

- Gratitude Guide offers curated starter packs such as small gratitude, savoring, appreciation, self-kindness, hard-day, and family/relationship prompts.
- Prompt packs should feel optional and gentle; choosing a suggestion should add editable text, not lock the user into a script.
- Users can edit default prompts.
- Users can add custom prompts.
- Users can disable prompts.
- Users can reorder prompts before v1 launch.
- Prompt edits affect future entries only; historical entries preserve the prompt text used at the time.

### Memory Lane

- Today shows the most meaningful available look-backs without waiting for a full year of history.
- Early users can see recent memories such as yesterday, 3 days ago, 1 week ago, or 2 weeks ago.
- As the archive grows, Today adds 1 month, 3 month, 6 month, 1 year, 2 year, and 3 year look-backs.
- If an exact date is unavailable, the app may show the closest entry within a small window, with wider windows for month/season targets.
- If no target matches, Memory Lane can surface the most recent kept memory so the section still creates value.
- When no look-backs exist yet, the web beta should explain the next Memory Lane milestones instead of feeling empty.
- When the first meaningful memory is saved, the web beta may celebrate that Memory Lane now has somewhere to begin.
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

### Little Details

- Little Details are optional structured memory notes for tiny things users may want to remember later.
- Examples include a child's funny pronunciation, favorite snack, bedtime routine, a personal milestone, a hobby breakthrough, a travel detail, or a quote from the day.
- The feature must not make the app feel child-only. Copy should support both family memories and self-focused personal milestones.
- Little Details can be attached to an entry and optionally associated with people tags.
- Each Little Detail can be tagged to one or more people independently of the whole entry, such as Me, each child, partner, family, or a custom person tag.
- The first implementation should keep this lightweight: a few optional fields or chips, not a separate complex tracker.
- Little Details should be visible in entry detail and discoverable from Memories filters or future search.
- The web beta should also support a Little Details repository where users can add, search, filter, edit, and remove details without treating them as a full tracker.
- Person pages and filters should be able to show both full memories and Little Details associated with that person.
- Little Details belong in the free core product because they improve memory capture and retrieval.
- Little Details copy can adapt to the journal shape: solo, partner, family, or custom people/themes.

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

- Current web beta uses Supabase as the private backend. Every journal row belongs to a workspace, RLS is enabled for journal tables, and private Storage paths are scoped by workspace id.
- Native v1 should remain local-first and sync only through the user's private iCloud database unless the product explicitly converges on the web/Supabase account model later.
- In the native app, photos are copied into the app container and referenced by filename.
- People tags are user-authored private metadata, not contacts or public profiles.
- Little Details are private journal content.
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
- Gratitude Guide suggestion usage and later editing rate.
- People tag creation and tagged-memory revisit rate.
- Little Details creation and revisit rate.
- Little Details repository search/filter usage.
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
- Whether people tags should be entry-level first, photo-level first, or both from v1.
- Whether Little Details should use fixed categories, custom categories, or a mix of both.
- Whether Gratitude Guide prompt packs should remain fixed, become user-editable, or become Premium-expanded later.
- Whether the long-term shared-memory product standardizes on Supabase accounts, iCloud-only native sync, or a bridge between both.
