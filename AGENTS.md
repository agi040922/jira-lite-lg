# Repository Guidelines

## Project Structure & Module Organization
- Next.js 16 App Router (TypeScript). Routes live in `src/app`; key views include `dashboard`, `issues`, `projects`, `inbox`, `settings`, `reviews`, and auth callbacks under `auth`, with Supabase test sandboxes under `test/*`.
- Shared UI blocks sit in `src/components`; reusable logic in `src/hooks`; typed helpers in `src/lib` (Supabase clients in `src/lib/supabase/{client,server}.ts`, misc helpers in `utils.ts`); data contracts in `src/types` and `src/types.ts`.
- Static assets reside in `public`; Supabase SQL (migrations, seeds) lives in `supabase/`; miscellaneous docs in `docs/`.

## Build, Test, and Development Commands
- `npm run dev` (or `pnpm dev`) starts the dev server at `http://localhost:3000`.
- `npm run build` compiles the production bundle; run before deploys to catch SSR/runtime errors.
- `npm run start` serves the built app locally.
- `npm run lint` runs ESLint with the Next.js/TypeScript config; fix warnings before opening a PR.

## Coding Style & Naming Conventions
- Prefer functional components and React Server Components by default; add `'use client'` only when hooks or browser APIs are needed.
- Use the `@/` path alias for imports; co-locate feature-specific components under their route folder when not reused elsewhere.
- TailwindCSS is the primary styling approach; keep class lists concise and avoid inline styles unless necessary.
- Follow the surrounding file’s quote/semicolon style; rely on ESLint/IDE formatting and keep identifiers descriptive and camelCased.

## Testing Guidelines
- No automated test runner is configured; rely on lint plus manual flows.
- For Supabase features, exercise the demo routes under `/test/*` (CRUD, storage, auth, realtime, editor, soft-delete, team-invite) and confirm redirects match `SUPABASE_REDIRECT_SETUP.md`.
- When adding checks, mirror the `src/app/test/<feature>/` pattern and keep fixtures or demo data in `src/mockData.ts`.

## Security & Configuration Tips
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_BASE_URL`, `GEMINI_API_KEY` (for AI tests). Keep them in `.env.local` and never commit secrets.
- Update Supabase redirect URLs for new auth-touching routes; reference `SUPABASE_REDIRECT_SETUP.md`. Avoid logging secrets in client bundles or middleware.

## Commit & Pull Request Guidelines
- Git history uses Conventional Commits (`feat:`, `fix:`, etc.) with short imperative scopes; continue that pattern.
- PRs should include: a concise summary, linked issue/ticket, screenshots for UI changes, notes on env/config updates, and manual QA steps run (`npm run lint`/`npm run build` at minimum).
- Keep changes scoped and incremental; update relevant docs (including `docs/` and this guide) when behavior shifts.
