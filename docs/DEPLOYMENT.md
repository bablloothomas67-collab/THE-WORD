# Deployment

## Environment variables

| Name | Where | Needed from | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend build | Task 002 | Public project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend build | Task 002 | Public anon key; safe only with RLS |
| `OPENAI_API_KEY` | Edge Function secret | Phase 4 | Never in frontend |
| `BIBLE_PROVIDER_API_KEY` | Edge Function secret | Phase 2 | After licence confirmed |
| `RAZORPAY_KEY_ID` | Edge Function secret | Phase 6 | |
| `RAZORPAY_KEY_SECRET` | Edge Function secret | Phase 6 | |
| `RAZORPAY_WEBHOOK_SECRET` | Edge Function secret | Phase 6 | Verify webhook signatures |
| `APP_URL` | Server / auth redirects | Task 002 | e.g. https://theword.example |
| `APP_ENV` | Both | Now | development / staging / production |

## Supabase setup (development project `qeyhpojsklbsutegchpz`)
1. Migration `20261106120000_profiles_and_languages.sql` — **applied 8 Nov 2026** via the Supabase connector.
2. **Authentication → URL Configuration**: Site URL `http://localhost:5173` (change to the real
   domain at launch); add redirect URLs `http://localhost:5173/**` and the production domain.
3. Test accounts `rls-test-a@theword.test` / `rls-test-b@theword.test` exist (created confirmed, no emails sent).
   Their passwords live only in the git-ignored `.env.test.local` used by `npm run test:rls`.
   Never use real people's emails for tests.
4. Local `.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (git-ignored).
5. Before public launch: configure a custom SMTP sender (Supabase's built-in email is rate-limited
   and for testing only).

## Environments
Development → Staging → Production, each with its own Supabase project and keys.

## Hosting (static site)
The frontend builds to static files (`npm run build` → `dist/`). Any static host
works (Vercel, Netlify, Cloudflare Pages). Configure:
- Build command `npm run build`, output `dist`.
- SPA fallback: rewrite all paths to `/index.html` so deep links like `/bible` work.
- Environment variables above for the frontend build.

### Vercel (configured — free Hobby plan)
`vercel.json` sets the build, the SPA rewrite, security headers and long caching for
hashed assets. `public/_redirects` gives Netlify / Cloudflare Pages the same fallback.

1. vercel.com → sign in with GitHub → **Add New → Project** → import `THE-WORD`.
2. Environment variables (Production and Preview): `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` — the public values only. Never add the service-role key.
3. Deploy. Note the URL (for example `https://the-word-xxxx.vercel.app`).
4. Supabase → Authentication → URL Configuration: set **Site URL** to that URL and add
   `https://the-word-xxxx.vercel.app/**` (and `http://localhost:5173/**` for development)
   to **Redirect URLs**, so confirmation and password-reset links land on the site.
5. Every push to `main` redeploys; pull requests get preview URLs.

## Release
- Work on branches, merge to `main` via pull request after `npm run check` passes.
- Tag releases (`v0.1.0`, …) and keep a rollback plan.
