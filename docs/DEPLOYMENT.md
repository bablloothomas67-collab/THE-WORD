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

## Environments
Development → Staging → Production, each with its own Supabase project and keys.

## Hosting (static site)
The frontend builds to static files (`npm run build` → `dist/`). Any static host
works (Vercel, Netlify, Cloudflare Pages). Configure:
- Build command `npm run build`, output `dist`.
- SPA fallback: rewrite all paths to `/index.html` so deep links like `/bible` work.
- Environment variables above for the frontend build.

## Release
- Work on branches, merge to `main` via pull request after `npm run check` passes.
- Tag releases (`v0.1.0`, …) and keep a rollback plan.
