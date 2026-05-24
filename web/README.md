# Photo Gratitude Journal Web

Production web beta for Photo Gratitude Journal. It uses Next.js, Supabase Auth, Supabase Postgres, Supabase Storage, and Vercel.

The public root route `/` is a private-beta homepage with research-backed product positioning, a product-loop mockup, privacy framing, and CTAs into the app. The journal product itself lives at `/app`; authenticated sign-in lives at `/login`.

Current app version: `0.2.9`. The package version is shown in Settings > Beta and should be included in QA notes.

## Local Development

```powershell
cd web
copy .env.example .env.local
npm.cmd install
npm.cmd run dev
```

`NEXT_PUBLIC_DEMO_MODE=true` lets the app run locally without Supabase credentials. The UI remains fully interactive through browser state so product review can continue before the Supabase project is connected.

With `NEXT_PUBLIC_DEMO_MODE=false`, authenticated edits autosave through Supabase-backed API routes. Demo local storage is ignored in that mode so server data stays authoritative.

In demo mode, the homepage primary CTA reads `Open the demo`. In Supabase mode, it reads `Open the beta`. Both routes point to `/app`; `/app` redirects unauthenticated Supabase users to `/login`.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/migrations/202605210001_initial_schema.sql`.
3. Run `supabase/migrations/202605230001_workspace_member_invites.sql`.
3. Create App URL and redirect URLs:
   - `http://localhost:3000/auth/callback`
   - your Vercel production URL plus `/auth/callback`
4. Copy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` into `.env.local` and Vercel.
5. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only in Vercel; never expose it to the browser.

## Deployment

- Import the GitHub repo in Vercel.
- Set root directory to `web`.
- Add environment variables from `.env.example`.
- Deploy from `main` after the web PR merges.

## Scope

The first web beta supports personal and shared household workspaces, household invite/member management, daily capture, private photo Storage upload, prompts, people tags, Little Details, Memories, Calendar, Memory Lane, Insights, export, and delete controls. Stripe/Premium billing is intentionally deferred.

Before widening household testing, verify the public homepage, owner/editor/viewer behavior, non-member denial, demo-vs-authenticated sync separation, and photo add/remove persistence with the checklist in `../docs/QA_TESTFLIGHT.md`.
