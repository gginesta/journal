# Codex Handoff Guide

This file is the fast-start guide for future Codex sessions and other AI agents working in this repository. Read it before changing code.

## What This Project Is

Photo Gratitude Journal is a private, photo-first gratitude and memory app. The emotional core is simple:

> Today helps the user notice. Memories helps the user rediscover. Little Details makes small things searchable over time.

The product started as an iOS app inspired by Five Minute Journal, but the active beta path is now the web app because it can be tested immediately on Windows, iPhone browser, iPad browser, and by a shared household without TestFlight friction.

The app is not a social network, camera roll clone, clinical mental-health tool, or productivity tracker. It is a calm private journal where a single photo, one line, or one tiny detail is enough.

## Current Source Of Truth

- Current active beta: `web/`, a Next.js + Supabase + Vercel app.
- Current web beta version: `0.2.10`.
- Production URL: `https://journal-gginestas-projects.vercel.app`.
- Production deploys from `main` with Vercel project root set to `web`.
- Supabase is the current backend for the web beta.
- Native iOS remains on the roadmap, but is not the immediate testing path.

## Read These First

1. `README.md` for repo overview and setup links.
2. `docs/PROJECT_CONTEXT.md` for the full product, architecture, and operating context.
3. `docs/CURRENT_STATUS.md` for the exact current beta state and remaining gates.
4. `docs/WEB_APP.md` for web/Supabase/Vercel operations.
5. `docs/QA_TESTFLIGHT.md` for manual QA.
6. `docs/ROADMAP.md` for milestones and next product work.
7. `docs/SUPABASE_AUTH_EMAILS.md` before touching auth email copy.

## Product Principles To Preserve

- Photos are the emotional anchor.
- One photo or one line is enough.
- Gratitude support should be gentle, never preachy.
- Low mood and hard days need soft prompts, not forced silver linings.
- Family/kids use cases matter, but the app must also work beautifully for solo, partner, friends, projects, places, and other custom themes.
- People tags are private labels, not public profiles or contacts.
- Little Details are optional memory fragments, not a complex tracker.
- Memory Lane should create value early through recent look-backs and later through monthly/seasonal/anniversary moments.
- Privacy and export/delete controls are core product features.

## Engineering Guardrails

- Do not commit secrets. Prior conversations may contain Supabase credentials; never copy them into docs or code.
- Keep `web/package.json` version aligned with visible Settings > Beta and docs when shipping a beta change.
- Demo mode and Supabase mode must stay separate. Demo localStorage must never overwrite authenticated Supabase data.
- Supabase role/RLS behavior is security-sensitive. Review `docs/WEB_APP.md` and the Supabase migration before changing tables, policies, Storage paths, or `SECURITY DEFINER` functions.
- Use workspace-scoped data access. Journal rows, people tags, details, photos, prompts, and reminders all belong to a workspace.
- Preserve owner/editor/viewer behavior:
  - owner: journal writes plus member management
  - editor: journal writes, no member management
  - viewer: read-only
- Do not add AI-generated journaling or clinical interpretation in the current beta.
- Do not add Stripe/Premium billing in the current beta unless explicitly requested.

## Web Commands

From `web/`:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

The E2E suite runs Chromium desktop and mobile projects. It covers the public homepage, onboarding, first-memory celebration, Little Details, photo add/remove, Memories, and mobile overflow guards.

## Deployment Workflow

The user prefers a tidy repo with `main` as the stable branch. For substantial work:

1. Create a focused branch.
2. Keep changes scoped.
3. Update docs and tests with behavior changes.
4. Run the relevant verification commands.
5. Merge to `main`.
6. Push `main`.
7. Check Vercel/GitHub status.
8. Delete the local feature branch after merge.

## Immediate Human QA Gate

Stephanie can test the web beta once she receives the live URL and magic-link email. The current remaining real-world gate is the authenticated household flow:

1. Guillermo logs in.
2. Guillermo creates or opens a household workspace.
3. Stephanie logs in once so Supabase has her user.
4. Guillermo invites/adds Stephanie by email from Settings.
5. Stephanie refreshes/logs back in and confirms she can access the shared workspace.
6. Both create and view shared memories.

Track feedback against app version `0.2.10`.
