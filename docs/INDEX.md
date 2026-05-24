# Documentation Index

This index is the starting map for anyone joining the project, including future Codex sessions. The repository now has product context, planning history, web implementation detail, beta operations notes, and native iOS roadmap material; this file explains where each piece lives and what to read first.

## Fastest Read Order

Read these in order when you need to understand the project quickly:

1. `README.md` - repository overview, current product status, and setup commands.
2. `AGENTS.md` - operating guide for future Codex sessions and coding agents.
3. `docs/PROJECT_CONTEXT.md` - full product, UX, architecture, and operating context.
4. `docs/CURRENT_STATUS.md` - exact current beta state, live URL, version, and known remaining work.
5. `docs/WEB_APP.md` - browser app setup, Supabase/Vercel notes, and web QA.
6. `docs/ROADMAP.md` - current milestones and what comes next.
7. `CHANGELOG.md` - shipped changes by version.

## Product And Strategy

- `docs/PROJECT_CONTEXT.md` is the canonical long-form explanation of what we are building and why.
- `docs/PRD.md` is the product requirements document for the guided gratitude memory system.
- `docs/ROADMAP.md` tracks the milestone plan and current beta-readiness work.
- `docs/DESIGN.md` describes the visual, UX, and emotional design direction.
- `docs/CURRENT_STATUS.md` captures where the live beta stands right now.

Use these files to understand the product thesis:

> Today helps you notice. Memories helps you rediscover. Little Details makes small things searchable over time.

## Implementation And Architecture

- `docs/ARCHITECTURE.md` explains the native iOS architecture and the web beta architecture.
- `docs/WEB_APP.md` is the operational guide for the Next.js/Supabase/Vercel implementation.
- `web/README.md` is the app-local setup guide for the browser beta.
- `docs/VERSIONING.md` explains app versioning and release tracking.
- `docs/SUPABASE_AUTH_EMAILS.md` documents the polished Supabase magic-link email copy and dashboard update process.

## QA And Release

- `docs/QA_TESTFLIGHT.md` is the cross-platform beta QA checklist. It currently includes web beta checks and iOS/TestFlight placeholders.
- `docs/TESTFLIGHT.md` documents the native iOS TestFlight path.
- `.github/pull_request_template.md` gives every PR a product/context/verification checklist.
- `.github/ISSUE_TEMPLATE/beta_feedback.md` is for Stephanie/internal tester feedback.
- `.github/ISSUE_TEMPLATE/feature_request.md` is for shaping new product ideas.

## Historical Goal Documents

These files capture earlier planning phases and should be treated as historical context unless they have been promoted into the current roadmap:

- `docs/GOAL_TESTFLIGHT_PROTOTYPE.md`
- `docs/GOAL_WORKING_BETA_ROADMAP.md`
- `docs/GOAL_V0_3_DESIGN_SYSTEM.md`

They are still useful for understanding why the product moved from native-only planning into a real web beta path.

## Design Prototype

- `docs/prototypes/design-review/README.md` explains the browser-based design review prototype.
- `docs/prototypes/design-review/index.html` is the static prototype that can be opened locally.

## What To Update When Work Changes

Update these files together when the beta changes materially:

- `CHANGELOG.md` for shipped behavior.
- `docs/CURRENT_STATUS.md` for live beta state and remaining gates.
- `docs/ROADMAP.md` for milestone movement.
- `docs/WEB_APP.md` for web setup, Supabase, Vercel, QA, or operations changes.
- `docs/PROJECT_CONTEXT.md` when the product thesis, target users, core workflows, or architecture materially changes.
- `README.md` when the repo entry point or current status changes.

Update `web/package.json` before a beta release if the app version should change. The version is shown in Settings > Beta and should be included in tester feedback.

## Security Reminder

Never commit Supabase database passwords, secret API keys, service role keys, local `.env` files, or private user journal data. Public anon/publishable keys can appear in environment configuration when appropriate, but keep secrets in Supabase, Vercel, or local ignored files only.
