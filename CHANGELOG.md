# Changelog

## 0.1.0 — 2026-11-06 — Task 001: Foundation

### Added
- React 19 + TypeScript + Vite project with React Router, i18next and the Supabase JS client.
- Design tokens (navy, ivory, antique gold, neutrals) with light and dark reading modes.
- Reusable UI: Button, ButtonLink, Card, Badge, TextField, LoadingState, EmptyState, ErrorState, Notice.
- Responsive app shell: desktop top navigation, mobile bottom navigation, skip link.
- Screens: Home, Bible placeholder, Ask the Word placeholder, Discover, My Journey, Login, Register, 404.
- English and Malayalam interface translations; Hindi/Tamil prepared and disabled.
- Persisted language and theme preferences; `<html lang>` kept in sync.
- Auth architecture (service, context, protected route) — inactive until Supabase is configured.
- Tests: translation completeness, validation, auth service, formatting, app shell, language switching.
- Docs: AGENTS.md, architecture, localisation, security, test plan, deployment.
