# Photo Gratitude Journal Web

Production web beta for Photo Gratitude Journal. It uses Next.js, Supabase Auth, Supabase Postgres, Supabase Storage, and Vercel.

## Local Development

```powershell
cd web
copy .env.example .env.local
npm.cmd install
npm.cmd run dev
```

`NEXT_PUBLIC_DEMO_MODE=true` lets the app run locally without Supabase credentials. The UI remains fully interactive through browser state so product review can continue before the Supabase project is connected.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/migrations/202605210001_initial_schema.sql`.
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

The first web beta supports personal and shared household workspaces, daily capture, photos, prompts, people tags, Little Details, Memories, Calendar, Memory Lane, Insights, export, and delete controls. Stripe/Premium billing is intentionally deferred.
