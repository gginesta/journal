# Project Context

This document is the canonical context file for Photo Gratitude Journal. It is intentionally explicit so future Codex sessions, collaborators, or reviewers can understand the product quickly without reconstructing months of decisions from chat history.

## One-Sentence Product Definition

Photo Gratitude Journal is a private, photo-first gratitude journal that helps people notice small good moments today and rediscover them later through photos, prompts, private tags, Little Details, Calendar, Memories, and Memory Lane.

## Why This Exists

The product is built around a simple emotional bet: people often have more good in their lives than they remember, especially when life is busy. A lightweight ritual that captures one photo, one line, or one small detail can help a person see the shape of their life more generously over time.

The app is inspired by the Five Minute Journal habit, but it differs in three important ways:

- Photos are the main memory object.
- Retrieval is as important as capture.
- Tiny details and people tags make ordinary life searchable later.

For the founding family use case, the app should preserve the small phases that are easy to lose: funny pronunciations, favorite snacks, repeated routines, small milestones, ordinary family rituals, partner moments, and photos that would otherwise disappear into a camera roll.

For the public future product, the app must also work for people who are not journaling about children. It should support solo growth, partner memories, friends, travel, work wins, hobbies, places, personal milestones, and custom themes.

## Core Product Thesis

The unified product move is:

> Today helps you notice; Memories helps you rediscover; Little Details makes small things searchable over time.

This means:

- The Today screen should reduce friction, not add homework.
- Memories should make rediscovery feel visual and rewarding.
- Little Details should catch fragments that photos and normal prompts miss.
- Memory Lane should create nostalgia and perspective as soon as possible, even before a user has year-old history.

## Product Tone

The tone is warm, calm, private, and lightly premium. The app should feel like opening a thoughtful private photo album, not like:

- a social feed
- a productivity dashboard
- a clinical tracker
- a parenting-only logbook
- a gamified streak machine

Language should be gentle. A low-energy day still counts. The app should never imply that a user failed because they wrote only one line, skipped photos, or had a hard day.

Good tone examples:

- "One photo or one line is enough."
- "This memory is now part of Memory Lane."
- "Your Memory Lane is starting."
- "Any tiny phase, phrase, snack, habit, or little thing worth remembering?"

Avoid:

- forced positivity
- clinical promises
- guilt around streaks
- public/social language
- overexplaining the UI inside the app

## Current Beta State

Current web beta version: see `web/package.json` (shown in Settings > Beta; canonical history in docs/VERSIONING.md).

The live web beta is deployed at:

```text
https://journal-gginestas-projects.vercel.app
```

The active production path is:

- GitHub repo: `gginesta/journal`
- Branch: `main`
- Vercel project root: `web`
- Public homepage: `/`
- Journal app: `/app`
- Magic-link sign-in: `/login`
- Supabase callback: `/auth/callback`

The web beta is production-grade enough for private family testing, but not yet public SaaS. The next meaningful gate is real authenticated household testing with Guillermo and Stephanie.

## Current Implementation Summary

### Web App

The web app is a Next.js App Router application under `web/`.

It includes:

- Public private-beta homepage at `/`.
- Magic-link login at `/login`.
- Interactive journal app at `/app`.
- Demo mode for local/unauthenticated UX review.
- Supabase Auth for production beta sign-in.
- Supabase Postgres for journal data.
- Supabase Storage for private original photos and thumbnails.
- Vercel deployment from `main`.

### Native iOS App

The repository also contains an iOS SwiftUI scaffold.

The iOS direction remains:

- iPhone-first SwiftUI app.
- SwiftData local persistence.
- CloudKit private database sync.
- PhotosPicker import.
- App-local protected photo files and thumbnails.
- Local reminders.
- Face ID/passcode lock.
- StoreKit 2 Premium scaffolding.
- WidgetKit later.

The iOS app is not the current private beta path because the user works on Windows and wants household testing immediately.

## Current Web Feature Set

### Public Homepage

Route: `/`

Purpose:

- Give beta testers context before entering the app.
- Explain the product loop.
- Frame the app as evidence-informed without medical claims.
- Show privacy posture.
- Route into `/app` or `/login`.

Important constraints:

- The homepage can cite gratitude, savoring, intentional photo-taking, and reminiscence research.
- It must not claim to treat, diagnose, cure, or guarantee mental-health outcomes.
- It must not rely on remote images to look polished.
- It must not block access to `/app`.

### Login

Route: `/login`

Behavior:

- Supabase email magic links.
- No password.
- Product-specific sent-state copy in the app.
- Actual email subject/body are controlled by Supabase Auth templates.

Tracked template:

- `web/src/lib/auth-email-copy.ts`
- `docs/SUPABASE_AUTH_EMAILS.md`

Current desired email subject:

```text
Your Photo Gratitude Journal sign-in link
```

### Onboarding

The onboarding is balanced and public-ready.

Paths:

- Just me
- Me and my partner
- Family / kids
- Other people or themes

Goals:

- Avoid assuming every user has children.
- Make family setup easy for Guillermo/Stephanie.
- Turn names/themes into private tags.
- Explain that Memory Lane starts soon, not only after a year.
- Reinforce that one good thing is enough.

### Today

Today is the main product surface.

It includes:

- Date and save state.
- Streak chip.
- Starter guide.
- First-memory celebration.
- Photo hero with one-or-two photo limit.
- Prompt responses.
- People/theme tags.
- Little Details.
- Mood.
- Completion summary.
- Pick-me-up memory.
- Gratitude Guide.
- Memory Lane.
- Prompt snapshot.

Completion rule:

- An entry counts when it has at least one typed response or at least one photo.

### First-Memory Celebration

Purpose:

- Make the first entry feel meaningful immediately.
- Explain that the memory now has somewhere to return.

Rules:

- Supports text-only, photo-only, or mixed entries.
- Shows once per workspace.
- Dismissal is stored in localStorage.
- Copy previews return windows: tomorrow, next week, one month.

Files:

- `web/src/lib/first-memory-celebration.ts`
- `web/src/components/wow/FirstMemoryCelebration.tsx`

### Gratitude Guide

Purpose:

- Help users when they do not know what to write.
- Keep support deterministic and non-AI in beta.

Prompt pack direction:

- Default gratitude
- Savoring
- Appreciation
- Self-kindness
- Hard day
- Family/relationships

Behavior:

- Suggestions append editable text.
- They should never erase what the user already wrote.
- Hard-day prompts should be gentle and not force silver-lining language.

### Photos

Rules:

- Encourage one or two photos.
- Do not block text-only entries.
- Photo-only entries are valid memories.
- Browser-selected images are compressed locally before sync.
- Supabase mode uploads originals and thumbnails to private Storage paths under the workspace id.

Storage buckets:

- `journal-photos`
- `journal-thumbnails`

### People/Theme Tags

Tags are private labels, not social tags or contacts.

They can represent:

- Me
- child
- partner
- family
- friends
- travel
- work wins
- projects
- places
- hobbies
- any custom memory subject

Tags can attach to entries and Little Details.

### Little Details

Little Details are tiny memory fragments. They are designed to capture things like:

- a funny phrase
- a favorite snack
- a routine
- a milestone
- a quote
- a place detail
- a small personal win

They are optional and must not make the product feel child-only.

Current behavior:

- Add from Today.
- Tag per detail.
- Search/filter through Memories/details repository behavior.
- Categories include note, phrase, favorite, routine, milestone, and quote.

Files:

- `web/src/lib/memory-details.ts`
- `web/src/components/wow/LittleDetailsNudge.tsx`
- `web/src/lib/shared-journal-copy.ts`

### Memories

Purpose:

- Photo-first retrieval.
- Search across entries, prompt responses, people/theme tags, and Little Details.
- Support details repository mode.

### Calendar

Purpose:

- Let users browse by date.
- Show completion/photo indicators.
- Open entry detail from a day.

### Memory Lane

Purpose:

- Show users what they were doing around this time before.
- Create early value for new users and deeper nostalgia for mature journals.

Progression:

- yesterday
- 3 days ago
- 1 week ago
- 2 weeks ago
- 1 month ago
- 3 months ago
- 6 months ago
- 1 year ago
- 2 years ago
- 3 years ago

When no match exists:

- Show milestone guidance instead of a blank state.

Files:

- `web/src/lib/early-memory-lane.ts`
- `web/src/components/wow/EarlyMemoryLane.tsx`

### Insights

Current beta includes:

- current streak
- longest streak
- completed entries
- mood distribution
- beta note

Insights should avoid pressure and guilt.

### Settings

Settings includes:

- account
- workspace switching
- household sharing
- reminders
- prompt editing
- people tags
- export JSON
- delete workspace entries
- beta version
- replay onboarding

Settings should feel plain, trustworthy, and predictable.

## Workspace Model

Every meaningful web data row belongs to a workspace.

Workspace kinds:

- personal
- household

Member roles:

- owner
- editor
- viewer

Role behavior:

- owner can edit journal content and manage members
- editor can edit journal content but cannot manage members
- viewer can read but cannot mutate

Accepted membership controls read access. Role controls write/admin access.

## Supabase Notes

The user has already applied:

- `202605210001_initial_schema.sql`
- `202605230001_workspace_member_invites.sql`

The invite function has been verified:

- `public.invite_workspace_member(uuid,text,text)` exists
- it is `SECURITY DEFINER`
- `authenticated` can execute it
- `public` cannot execute it

Do not add new `SECURITY DEFINER` functions casually. If a function must be security definer, ensure it has explicit authorization checks, a controlled search path, and no public execute grant.

## Known Operational Facts

- Vercel production is connected and deploys from `main`.
- Vercel Authentication protection has been disabled so testers can reach the app.
- Supabase Auth still protects the journal app.
- Magic-link redirects include local and production callback URLs.
- Supabase Storage buckets are private.
- The current test command runs all unit test files under `web/tests/*.test.ts`.

## Immediate Next Steps

Before wider private testing:

1. Apply the Supabase Auth email template from `docs/SUPABASE_AUTH_EMAILS.md`.
2. Guillermo logs in to production.
3. Stephanie logs in once to create her Supabase Auth user/profile.
4. Guillermo creates/opens a household workspace.
5. Guillermo adds Stephanie as an editor or owner.
6. Stephanie refreshes/logs back in.
7. Confirm Stephanie sees the shared workspace.
8. Both users create and view at least one shared memory.
9. Record issues against the app version shown in Settings > Beta.

## Known Risks

- Real authenticated two-person household QA is still the most important unproven flow.
- Concurrent edits by two household members are treated as beta risk; current sync is simple and latest-save behavior may need refinement.
- Native iOS has not been validated in this Windows workspace.
- Supabase email templates are tracked in repo but must be applied in Supabase.
- Billing/Premium is intentionally deferred.

## Definition Of Ready For Stephanie

Stephanie can test when:

- Vercel production is green on `main`.
- Settings > Beta shows the version from `web/package.json`.
- She can receive a magic link.
- She can complete onboarding on phone.
- She can create one memory with text or photo.
- She can add a Little Detail.
- She can see Memories/Calendar/Memory Lane.
- She can access the shared household workspace after Guillermo adds her.

## Definition Of Ready For Wider Private Beta

The app is ready for more private testers when:

- The household flow passes with Guillermo and Stephanie.
- The Supabase email template is polished and applied.
- Owner/editor/viewer role QA passes with real accounts.
- Non-member access denial is verified.
- Photo upload/reload works in Supabase mode for accepted members.
- There are no stop-ship mobile layout issues.
- There is a short feedback process for testers.
