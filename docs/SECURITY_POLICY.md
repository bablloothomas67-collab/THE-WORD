# Security policy

## Secrets
- Browser code may contain only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Anything prefixed `VITE_` is public. Never use that prefix for OpenAI, Bible
  provider, Supabase service-role or Razorpay credentials.
- Server secrets live in Supabase Edge Function secrets (and the host's secret store).
- `.env`, `.env.local` and `.env.*.local` are git-ignored. `.env.example` lists names only.

## Data protection
- Row Level Security on every user-owned table (Task 002 onward): owner-only access
  for profiles, bookmarks, highlights, notes, prayer entries, reading progress and
  AI conversations.
- Prayer entries are private by default — no public read policy, no admin browsing,
  never sent to analytics or AI.
- Users can never write their own subscription status or entitlements.
- Admin actions are role-restricted and recorded in `audit_events`.

## Frontend
- Client-side route guards (`ProtectedRoute`) are a UX convenience only; the
  database enforces access.
- No `dangerouslySetInnerHTML`; React escapes all rendered text.
- Fonts are self-hosted; no third-party trackers or CDNs.

## Status at Task 001
No backend is connected, no data is stored except two preferences in
`localStorage` (`theword.language`, `theword.theme`). No secrets are in the repo.
