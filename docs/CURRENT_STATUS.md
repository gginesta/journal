# Current Status

Last updated: 2026-05-24.

## Summary

Photo Gratitude Journal is in private web beta preparation. The current beta is functional, deployed, and ready for Stephanie to test after the final production magic-link email template is applied or accepted as a non-blocking follow-up.

The active app version is:

```text
0.2.10
```

The live URL is:

```text
https://journal-gginestas-projects.vercel.app
```

## What Is Done

- Next.js web app under `web/`.
- Public private-beta homepage at `/`.
- Interactive journal app at `/app`.
- Supabase magic-link sign-in at `/login`.
- Supabase Postgres schema and RLS migrations.
- Private Supabase Storage buckets for journal photos and thumbnails.
- Vercel production deployment from `main`.
- Demo mode for local UX review.
- Personal and household workspaces.
- Owner/editor/viewer role model.
- Household member invite route using `public.invite_workspace_member`.
- Daily Today flow.
- Text-only, photo-only, and mixed memory completion.
- One-or-two photo behavior.
- Balanced onboarding for solo, partner, family, and custom themes.
- Private people/theme tags.
- Gratitude Guide deterministic prompt suggestions.
- Little Details capture and repository-style retrieval.
- First-memory celebration.
- Progressive Memory Lane and early empty-state guidance.
- Memories, Calendar, Insights, Settings.
- JSON export and delete workspace entries.
- App version visibility in Settings > Beta.
- Mobile overflow regression checks.
- Desktop/mobile Playwright E2E.

## What Is Deployed

Vercel is connected to GitHub and deploys `main`.

Production app:

```text
https://journal-gginestas-projects.vercel.app
```

Routes:

- `/`: public private-beta homepage
- `/app`: journal app
- `/login`: magic-link login
- `/auth/callback`: Supabase Auth callback

## What Was Recently Added

Version `0.2.10` added:

- first-memory celebration
- early Memory Lane milestone guidance
- context-aware Little Details nudge
- warmer shared-journal copy
- product-specific login sent-state copy
- Supabase magic-link template documentation
- public homepage and homepage E2E coverage

Version `0.2.9` added:

- mobile onboarding and login layout polish
- no email overflow in onboarding
- mobile overflow guard tests

Version `0.2.8` added:

- progressive Memory Lane look-back targets for young accounts

## Verification Status

Latest verified commands from `web/`:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Latest expected test state:

- Unit tests: all pass.
- E2E tests: desktop and mobile pass.
- Vercel: green on `main`.

## Supabase Status

Applied and verified:

- `202605210001_initial_schema.sql`
- `202605230001_workspace_member_invites.sql`

Verified invite function state:

- `public.invite_workspace_member(uuid,text,text)` exists.
- It is `SECURITY DEFINER`.
- `authenticated` can execute it.
- `public` cannot execute it.
- Required Journal tables/functions still read cleanly.

Supabase Auth:

- Email magic-link auth is enabled.
- Redirects include local and production callback URLs.
- Production app URL callback is configured.
- Actual email template still needs to match `docs/SUPABASE_AUTH_EMAILS.md` if not already applied.

Storage:

- `journal-photos` bucket exists and is private.
- `journal-thumbnails` bucket exists and is private.

## Immediate Remaining Work

### Blocking For Wider Beta

- Real two-account household QA with Guillermo and Stephanie.
- Confirm Stephanie can access the shared household workspace after being added.
- Confirm accepted member photo previews load.
- Confirm viewer/editor/owner behavior with real accounts.

### Not Blocking Stephanie's First Test

- Apply the polished Supabase Auth email template if not already done.
- Add more formal tester feedback capture.
- Improve conflict handling for simultaneous household edits.

## Stephanie Test Script

Use the live URL:

```text
https://journal-gginestas-projects.vercel.app
```

Ask Stephanie to test on iPhone first.

1. Open the URL.
2. Confirm the homepage feels clear and trustworthy.
3. Sign in with magic link.
4. Confirm Settings > Beta shows `0.2.10`.
5. Complete onboarding as family/kids, partner, or whichever feels natural.
6. Add one photo or one line in Today.
7. Confirm the first-memory celebration appears.
8. Add a Little Detail.
9. Tag the detail to a person.
10. Open Memories and search for the detail.
11. Open Calendar.
12. Check Memory Lane.
13. After Guillermo adds her to a household workspace, confirm she can switch to it and see shared memories.

## Feedback To Capture

For every issue:

- app version
- device
- browser
- account email
- workspace name and role
- what she expected
- what happened
- screenshot if visual
- whether it happened after refresh

## Current Product Decisions

Decided:

- Web/Supabase is the active beta path.
- iOS remains on roadmap.
- Core journaling is free.
- Billing is deferred.
- AI is deferred.
- Family is important but not the only framing.
- Little Details are part of core memory capture.
- People tags are private labels, not social profiles.

Still open:

- Final product/app name.
- Final icon/brand identity.
- Whether app lock is free or Premium in native.
- Long-term backend: Supabase-only, iCloud-only, or hybrid.
- Whether expanded prompt packs become Premium.
- How to handle concurrent edits elegantly.
- Whether to add Stripe later.
