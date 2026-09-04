# CLAUDE.md

Guidance for working in this repository.

## Testing

**Always write tests first.** Follow TDD: add a failing test that captures the bug
or the new behavior, watch it fail, then write the code to make it pass. Tests live
in `frontend/src/__tests__/` and `backend/tests/` (Vitest).

## Commit conventions

**Each bug fix and each new feature gets its own separate commit.** Do not bundle
multiple bugs/features into one commit — split them, even when they touch the same
file (stage the relevant hunks per commit). Prefix messages with `Fix:` for bugs
and `Feature:` for new functionality.

**Prefer fixup commits.** When a change corrects or amends work from an existing
commit that has **not been pushed yet**, create a `git commit --fixup=<sha>`
targeting that commit (rather than a new standalone commit), so it can be
autosquashed later. Only make a standalone commit when the change doesn't belong
to an existing unpushed commit.

## Project layout

MyTaste is a digital recipe book — a TypeScript monorepo:

- `frontend/` — Vite + React + TypeScript, styled with **Tailwind CSS v4**. Tests
  with Vitest (`frontend/src/__tests__/`).
- `backend/` — Express + TypeScript API. Tests with Vitest (`backend/tests/`).
  JSON data lives in `backend/data/` (recipes, collections, config).
- `Dockerfile` — production **mono-image**: the built frontend is copied into the
  backend's `./public` and served same-origin on port 5000.

## Common commands (run from repo root)

- `npm run dev` — start frontend (:5173) and backend (:5000) together. The Vite dev
  server proxies `/api` → `http://localhost:5000`.
- `npm run test:all` — backend then frontend tests. Or `npm test` inside either package.
- `npm run build` — build the frontend; `npm run build:backend` compiles the backend.
- `npm run format` / `npm run format:check` — Prettier.

## Conventions & gotchas

- **Same-origin deployment:** in the mono-image `API_URL` is empty and everything is
  same-origin. Anything fetched by the user's browser (apiFetch, images) may use a
  relative path, but URLs consumed by _external_ services must be absolute (e.g. the
  Bring deeplink resolves `window.location.origin`).
- **Styling:** Tailwind utility classes only (no CSS modules / styled-components).
  Colors are design tokens declared in `frontend/src/index.css` (`@theme` block with a
  `[data-theme='dark']` override) — use tokens, not raw hex. `frontend` has a
  `check:no-hex` guard. Always verify UI changes in **both light and dark mode**.
- **Caching:** the frontend has a hand-rolled localStorage recipe cache
  (`frontend/src/utils/recipesCache.ts`) plus a Workbox `StaleWhileRevalidate` service
  worker. After any mutation, update the cache (`upsertRecipe` / `fetchAndCache`) so the
  UI doesn't show a stale snapshot.
- **Auth:** gated by the `REQUIRE_LOGIN` env var; admin credentials via
  `ADMIN_USER`/`ADMIN_PASS`, sessions via JWT cookies. `AuthContext` rehydrates from
  `/api/refresh` on load.
