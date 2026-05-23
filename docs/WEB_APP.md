# Web App Plan And Operations

The web app lives in `web/` and is the active private-beta path for the consolidated Guided Gratitude Memory System. It is a real Next.js + Supabase app, not just a static prototype, and should be treated as the source of truth for shared household beta behavior.

Current app version: `0.2.8`. The version comes from `web/package.json` and is shown in Settings > Beta for tester reports.

## Beta Product Path

- The beta validates the daily gratitude loop, private memory retrieval, and shared household model before wider native distribution.
- Onboarding should feel balanced for solo/self, partner, family, and custom people/themes. Family/kid memories are important, but they must not dominate the product framing.
- Gratitude Guide prompt packs provide non-AI writing starters for small gratitude, savoring, appreciation, self-kindness, hard days, and family/relationships.
- Little Details are first-class retrievable memory fragments. They can live inside an entry and should also be reachable through a repository-style view for search, filtering, editing, and removal.
- Demo mode is for UX review. Supabase mode is for real beta data and verification.

## Architecture

- Next.js App Router with TypeScript.
- Supabase Auth with email magic links.
- Supabase Postgres for journal data.
- Supabase Storage for private original photos and thumbnails.
- Workspace-based data model for personal and household journals.
- Vercel deployment with `web/` as the project root.
- Demo-mode local persistence for unauthenticated UX review.

## Privacy Model

- Every journal row belongs to a workspace.
- Users can read only workspaces where they are accepted members and write according to their workspace role.
- Accepted workspace members can read member lists and journal content for that workspace.
- Owners and editors can create, update, and delete journal content, prompts, tags, reminders, and private photo objects.
- Only owners can rename workspace records or manage `workspace_members`.
- A workspace must always keep at least one accepted owner.
- RLS is enabled for all journal tables, and policies are scoped to the Supabase `authenticated` role.
- Storage object paths must start with the workspace id, allowing RLS to protect private photo files and fail closed for malformed paths.
- Prompt responses, photo metadata, and person tag joins are checked so they cannot link records across workspaces.
- Little Details and per-detail person tag joins are checked so detail records cannot leak across workspaces.
- No public profiles, public feeds, or social sharing.

## Local Demo Mode

The app can run without Supabase credentials using:

```text
NEXT_PUBLIC_DEMO_MODE=true
```

Demo mode stores changes in browser local storage. This is only for UX review and PC testing; production data should use Supabase. When Supabase mode is enabled, server data is treated as the source of truth and demo local storage is ignored.

## Supabase Sync Behavior

- Authenticated users load journal data through server-side Supabase queries.
- Edits to the active workspace are debounced and posted to `/api/journal/sync`.
- The sync route upserts people tags, prompt templates, reminder preferences, entries, sessions, prompt responses, entry people links, Little Details, and per-detail people links.
- Browser-selected photos are uploaded from compressed local previews into private Supabase Storage paths under `<workspace-id>/<local-date>/...`.
- Photo metadata is written only after Storage upload succeeds, and future page loads use signed URLs for private photo previews.
- Workspace creation uses the secured `public.create_workspace` database function through `/api/workspaces`.
- Delete workspace entries uses `/api/journal/delete-workspace-entries` and relies on RLS plus cascade deletes for child rows.
- Household invitation/member-management lives in Settings. Owners can invite existing signed-in users by email, assign roles, change roles, and remove non-self members.

## Sync Safety Rules

- In Supabase mode, server data is authoritative. Demo localStorage must not restore over authenticated workspace data.
- Test demo mode and Supabase mode in separate clean browser profiles when possible.
- Before testing a production-like account, clear stale demo data or use a browser profile that has never run demo mode.
- Two accepted members editing the same workspace should be treated as a beta risk area until conflict handling is more granular; record which account, role, entry date, and browser performed each edit.
- Photo metadata should appear only after the private Storage upload succeeds.
- Signed photo URLs should be treated as temporary previews; do not copy them into product data or docs as stable assets.

## Product Surfaces To Verify

- Onboarding:
  - First-run tour explains the tiny daily loop.
  - Memory-focus choices support solo/self, partner, family, and custom people/themes.
  - Friendly names or tags become private person/theme tags.
  - Settings can replay onboarding.
- Today:
  - Text-only, photo-only, and mixed entries count as valid beta memories.
  - Gratitude Guide suggestions can be inserted and edited.
  - People/theme tags and Little Details are optional.
- Memories:
  - Search includes dates, prompt text, response text, people/theme tags, and Little Details.
  - Person/theme filters include Little Details tagged directly to that person/theme, not only entry-level tags.
  - Memory cards open full entry detail.
- Little Details repository:
  - Details can be created without forcing a full long-form entry.
  - Details can be filtered by category and person/theme tag.
  - Details can be edited and removed.
  - Repository-created details attach to the selected local date and sync through the same entry/detail tables.
- Settings:
  - Workspace switching, prompt editing, people tags, reminders, export, delete controls, and sign out remain understandable in both demo and Supabase modes.

## Windows Local Setup

From PowerShell:

```powershell
cd web
copy .env.example .env.local
npm.cmd install
npm.cmd run dev
```

For local UX review without a Supabase project, keep `NEXT_PUBLIC_DEMO_MODE=true` in `web/.env.local`.

For local Supabase testing, set these values in `web/.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=false
SUPABASE_PHOTOS_BUCKET=journal-photos
SUPABASE_THUMBNAILS_BUCKET=journal-thumbnails
```

Do not put `SUPABASE_SERVICE_ROLE_KEY` in browser-readable code. It can exist in `.env.local` for server-only scripts, but the beta app should not require it for normal user flows.

## Supabase Private Beta Setup

1. Create a Supabase project for the private beta.
2. Run `web/supabase/migrations/202605210001_initial_schema.sql` in the Supabase SQL editor or through the Supabase CLI.
3. Run `web/supabase/migrations/202605230001_workspace_member_invites.sql` so owner-managed household invites can look up existing signed-in users safely.
4. Confirm the migrations created private Storage buckets:
   - `journal-photos`
   - `journal-thumbnails`
4. In Authentication, enable email magic links.
5. Configure Auth site URL and redirect URLs:
   - `http://localhost:3000/auth/callback`
   - Vercel preview URL plus `/auth/callback` if preview testing is enabled
   - production Vercel URL plus `/auth/callback`
6. Keep signups limited to invited beta testers using Supabase Auth controls for the project. For a tight beta, add testers manually or gate invitations before sharing the login URL.
7. Smoke-test with two real beta accounts before sharing the app:
   - Account A creates or owns a household workspace.
   - Account B is added as a workspace member.
   - Account B can read shared workspace content after `invitation_state='accepted'`.
   - A viewer cannot write journal data.
   - An editor can write journal data but cannot manage workspace membership.
   - A non-member cannot read workspace rows, journal rows, member rows, or storage objects.
   - Private photo signed URLs load for accepted members and fail for non-members.
   - Little Details and per-detail tags obey the same workspace boundaries as entries.

## Vercel Deployment

1. Import the GitHub repo in Vercel.
2. Set the project root directory to `web`.
3. Set the build command to the default Next.js build or `npm run build`.
4. Add production environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_APP_URL=<production-vercel-url>
NEXT_PUBLIC_DEMO_MODE=false
SUPABASE_PHOTOS_BUCKET=journal-photos
SUPABASE_THUMBNAILS_BUCKET=journal-thumbnails
```

5. Add `SUPABASE_SERVICE_ROLE_KEY` only if a server-side beta operation requires it. Never expose it with a `NEXT_PUBLIC_` prefix.
6. Deploy from `main` after the web PR merges.
7. After deployment, send one magic link through the production URL and confirm the callback returns to the app.

## Migration Notes

- The initial migration creates user profiles, personal workspaces, default tags/prompts, reminder preferences, RLS policies, and private Storage buckets.
- New Auth users automatically receive a personal workspace through the `on_auth_user_created` trigger.
- Use `public.create_workspace(workspace_name, workspace_kind)` for authenticated workspace creation so owner membership and defaults are created together.
- Store photo objects under `<workspace-id>/...` in `journal-photos` and `journal-thumbnails`.
- Keep `workspace_members` as the source of truth for shared access. Accepted membership grants reads; role decides write/admin capability.

## Beta QA

- Confirm Settings > Beta shows app version `0.2.8`.
- Login with email magic link.
- Confirm default personal workspace appears.
- Create household workspace and switch between workspaces.
- Complete onboarding once as solo/self, once as family, and once with custom people/themes in clean browser profiles.
- Confirm family copy is present but not mandatory or dominant.
- Use a Gratitude Guide suggestion, edit it, save it, and confirm the edited response appears in Memories and entry detail.
- Confirm household access from a second accepted member account.
- Confirm a viewer can read but cannot write entries, photos, prompts, tags, reminders, or member rows.
- Confirm an editor can write journal content but cannot update `workspace_members`.
- Confirm only an owner can update workspace settings or membership.
- Confirm a non-member cannot read the household workspace, journal rows, member rows, Little Details, or private photo objects.
- Create a text-only entry.
- Add one photo, add a second photo, remove one photo, reload, and confirm the remaining photo state is correct.
- Confirm a photo-only entry counts as a kept memory and appears in Memories/Calendar where expected.
- Add people tags and Little Details.
- Add a Little Detail from the repository flow if present.
- Filter Little Details by text, category, and person/theme tag.
- Edit and remove a Little Detail, then reload and confirm persistence.
- Search Memories by person, prompt text, response text, and detail text.
- Browse Calendar and Memory Lane.
- Confirm a young workspace gets useful Memory Lane cards from recent history before year-old data exists.
- Export JSON.
- Delete workspace entries only after confirming backup/export behavior.

## Beta Exit Criteria

- Web lint, typecheck, unit tests, build, and Chromium E2E pass from a clean checkout.
- Manual Supabase beta QA passes with at least two authenticated accounts and two workspace roles beyond owner where practical.
- No known RLS, Storage, or cross-workspace data-leak issue remains open.
- Demo mode and Supabase mode have been tested separately, including confirming authenticated data is not overwritten by demo localStorage.
- Solo/self, family, and custom onboarding paths have been tested on desktop and mobile viewport sizes.
- Little Details repository behavior has been tested for create, search/filter, edit, delete, reload, and entry-detail retrieval.

## Verification Commands

From PowerShell:

```powershell
cd web
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

For Supabase, apply the migration to a fresh beta project first. Then test the owner/editor/viewer matrix with real authenticated users before reusing the migration in production.
