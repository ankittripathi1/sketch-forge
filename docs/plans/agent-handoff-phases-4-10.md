# Agent handoff: Sketch Forge production-readiness, phases 4-10

**Purpose:** brief for a coding agent (any model) to implement one remaining phase
without needing prior context. Each phase below is self-contained. Do one phase,
run its gate, stop.

**Source of truth for scope:** `docs/plans/production-readiness-implementation-plan.md`.
This file is the *execution* guide with the repo-specific detail an agent needs.
If the two disagree, the plan wins on scope, this file wins on repo mechanics.

**Status when this was written (2026-08-26):** phases 0, 1, 2 done. Phase 3 code
complete, gate blocked on a VPS change. Next up is phase 4.

---

## 0. Read this before touching anything (every phase)

### Rules that are not optional

- **Preserve inherited work.** The working tree has many uncommitted changes and
  untracked files that are real. Never `git reset`, `git clean`, `git checkout --`,
  `git stash`, or bulk-stage. Never revert a file you didn't just write.
- **Do not commit, push, or open a PR** unless the human explicitly says so.
- **One phase per session.** Do not start the next phase even if you have time.
- **No production database.** Everything runs against a local throwaway database
  (see below). If a phase needs prod state you don't have, stop and report it.
- **Secrets never get printed.** Not in logs, not in test output, not in this
  repo's files. Error messages name variables, never values.
- **Match the code around you.** Comment density, naming, and idioms follow the
  file you're editing. Don't reformat untouched code.

### The stack, in one paragraph

Bun-managed Turborepo. API is Hono on Bun in `apps/api` (port 4001). Web is
Next.js App Router in `apps/sketch-forge` (port 3000). Shared packages in
`packages/*`: `@repo/db` (Drizzle + Postgres), `@repo/schema` (zod), `@repo/canvas-engine`,
`@repo/element`, `@repo/common`, `@repo/math`, `@repo/ui`. Everything is TypeScript,
ESM, strict.

### Repo mechanics that will trip you up

- **Imports use `.js` extensions on relative paths** even though the files are
  `.ts` (`import { env } from "./env.js"`). This is required. Match it.
- **Bun test config lives in `apps/api/bunfig.toml`**, which preloads
  `apps/api/test/setup.ts`. That file selects the test database and sets fake
  env vars *before any test imports `@repo/db` or `lib/env.ts`* (both read env at
  import time). If you add an env var that the API reads at startup, add a safe
  test value there too or every API test fails to import.
- **The API validates env at startup** in `apps/api/src/lib/env.ts` and refuses
  to boot on a bad value. Adding a required env var means updating: `env.ts`, the
  test setup, `.env.example`, `turbo.json` `globalEnv`, and `docker-compose.yml`.
- **Single public origin is a settled decision.** Web and API share one origin;
  `/api` is reverse-proxied to the API. Don't reintroduce a second API hostname
  or a shared cookie domain.
- **Session cookie name differs by environment**: `session` in dev,
  `__Host-session` in production. The name is defined in
  `apps/api/src/lib/cookies.ts` and mirrored in `apps/sketch-forge/src/api/config.ts`;
  both have tests on the literal. Keep them in sync.

### Setting up the throwaway test database (needed for any DB phase)

Local PostgreSQL must be running. Then, once per machine:

```bash
# from repo root
createdb sketchforge_test   # or: psql -d postgres -c "CREATE DATABASE sketchforge_test;"

# push the current schema into it (from packages/db)
cd packages/db
DATABASE_URL="postgres://<user>@127.0.0.1:5432/sketchforge_test" bunx drizzle-kit push --force
cd ../..
```

Run API integration tests with the DB pointed at the test database:

```bash
cd apps/api
TEST_DATABASE_URL="postgres://<user>@127.0.0.1:5432/sketchforge_test" bun run test:integration
```

`apps/api/test/setup.ts` refuses to run against any database whose name does not
end in `_test`. Do not weaken that guard.

### The standard quality gate (run at the end of every phase)

```bash
# from repo root
bunx turbo run lint check-types --force
bun run test
bun run build
git diff --check

# plus, for any phase that touched apps/api:
cd apps/api && TEST_DATABASE_URL="postgres://<user>@127.0.0.1:5432/sketchforge_test" bun run test:integration
```

Report each as passed / failed / blocked / not-run. Do not claim a phase done
unless its own completion gate passes.

### How to prove a security or data-safety test actually works

For any test asserting a guarantee (ownership, single-use, conflict rejection),
temporarily break the code the test covers, confirm the test goes red, then
restore. A test that passes against broken code is worthless. Restore by copying
the file back, not by editing, so you can't leave a stray change.

### UI changes are mock-first

Phases 6, 9, and 10 touch user-facing UI. For any non-trivial visual, layout, or
landing-copy change: build a few static mocks, show them, wait for the human to
pick one, then implement. Do not edit real components first. Standing constraints:
dark mode, true black `#000` background, white primary text, information-dense,
no decorative chrome, minimal copy, no em dashes, no continuously-repainting CSS
animations.

### Reporting back (every phase)

State: phase, resulting behavior, files changed, each gate command with its exact
outcome, anything blocked, and confirm nothing was staged/committed/pushed. Then
update `docs/plans/production-readiness-implementation-plan.md`: mark only your
phase, record concise evidence using the template at the bottom of that file,
leave later phases unchecked. If the gate fails, leave the phase unchecked and
document the blocker.

---

## Phase 4: Repair and prove database migrations (P0)

### The defect

Migration `0001_page_theme_thumbnails.sql` runs `ALTER TABLE "pages"` before
`0002_mixed_master_chief.sql` creates the `pages` table. So a clean database
cannot migrate from empty. Current migration order and bodies:

- `0000_kind_shatterstar.sql` - users, oauth_accounts, refresh_tokens, canvases.
- `0001_page_theme_thumbnails.sql` - `ALTER TABLE pages ADD thumbnail_light/dark`. **Broken: pages does not exist yet.**
- `0002_mixed_master_chief.sql` - creates folders, magic_link_tokens, pages, review_logs, enum.
- `0003_wonderful_vivisector.sql` - `ALTER TABLE pages ADD note, view_mode`.

The current schema in `packages/db/src/schema.ts` is correct and is what
`drizzle-kit push` produces. The *migration history* is what's broken.

### Mandatory discovery gate (do this first, record findings, do not skip)

Determine and write down, without putting any credential in a file or in output:

1. Is there a production database with real user data? Memory/context says the
   old Supabase project (ref `ksjchpfrpgzonleomhkc`) is dead (NXDOMAIN) and
   migration 0003 was never applied to it. **Confirm the current prod DB** used
   by the live VPS deployment before assuming anything.
2. Were migrations applied via drizzle, or was the schema created with `push`?
   Check `drizzle.__drizzle_migrations` if it exists. `packages/db/scripts/prod-migrate.sh check`
   does this read-only if you have the prod URL.
3. Current prod columns, indexes, constraints, enum values.
4. A verified backup + restore point exists.

If you cannot safely reach prod, **stop and ask the human**. Do not guess.

### The two paths

- **No prod user data** (most likely here): regenerate one clean baseline
  migration from `schema.ts` and prove it applies from empty. Concretely:
  archive the four broken migrations, delete the drizzle journal/snapshots,
  `bunx drizzle-kit generate` a single `0000` baseline, verify it produces the
  same schema `push` does.
- **Prod data exists:** do NOT rewrite applied history. Write a reviewed
  reconciliation that preserves the live schema and separately gives a clean-install
  path. Stop for human approval before any prod apply.

### Owned files

- `packages/db/drizzle/**` (migrations, journal, snapshots)
- `packages/db/drizzle.config.ts` if needed
- `packages/db/package.json` scripts, and a migrate step wired into deployment
- migration test files
- Do not change `packages/db/src/schema.ts` unless a real schema defect is found.

### Required verification

1. Empty database migrates to latest with no error.
2. A production-shaped fixture migrates without data loss.
3. Existing API integration tests (auth, ownership) pass against the migrated schema.
4. Expected indexes and foreign keys exist after migrating.
5. Migration is recorded idempotently and does not rerun.
6. Backup restore tested before any prod apply.

Add an automated test that spins up an empty database, runs the migration chain
(not `push`), and asserts the resulting schema matches. This is the regression
proof.

### Completion gate

- Clean-install and (if applicable) upgrade paths both pass in automation.
- Migration runs as part of deployment, not a developer-only local script.

### Dependencies / notes

Phase 2 wanted a same-tenant DB constraint and Phase 3 wanted a unique
`(provider, providerAccountId)` constraint and per-session revocation; all were
deferred to here because they need clean migration history. If path is
"no prod data", consider adding: unique index on `oauth_accounts(provider, providerAccountId)`.
Coordinate with the human before adding the tenant CHECK constraints.

---

## Phase 5: Remove vulnerable runtime dependencies (P0)

### Contract

1. **Remove unused root deps first.** `axios` and root-level `oslo` were not
   imported anywhere at audit time. Verify with a repo-wide search, then remove
   from root `package.json`. (Note: `apps/api` uses `oslo/oauth2` legitimately;
   only the *root* `oslo` is suspect. Check before removing.)
2. Update direct vulnerable runtime packages in **small groups**, starting with
   Next.js and Hono. Run the full gate after each group.
3. Update Turbo and build tooling **separately** from runtime packages.
4. Regenerate `bun.lock` only through scoped `bun add`/`bun remove`, never by
   hand-editing.
5. Read breaking-change notes from each package's own docs before bumping a major.
6. Classify any leftover advisory as runtime-reachable, build-only, or false
   positive. Don't dismiss something just because it's transitive.

### Owned files

- Root `package.json`, `bun.lock`
- `apps/*/package.json`, `packages/*/package.json` as needed
- Do not change application source unless a breaking API change forces a small,
  documented edit.

### Completion gate

```bash
bun run test
bun run test:coverage
bunx turbo run lint check-types --force
bun run build
bun audit
git diff --check
```

Target: zero known high-severity **runtime** vulns. Any remaining advisory has a
written reason (dev-only, unreachable, etc.). Baseline at audit was 69 advisories
(27 high, 37 moderate, 5 low); reduce the runtime-reachable high ones to zero.

### Notes

`package.json` has an `overrides` block pinning `@codemirror/state` and
`@codemirror/view`. Those pins are load-bearing for the notes editor. Do not
remove them. (See the `notes-editor-architecture` note.)

---

## Phase 6: Bound and stabilize the API (P1)

### Contract

- Global JSON/body size limit before parsing (Hono has `bodyLimit` middleware).
- Bound: page count, element count, points per stroke, text length, image src
  length, thumbnail length, tag count, batch reorder size. These belong in the
  zod schemas in `packages/schema/src/` (`page.ts`, `canvas.ts`, `folder.ts`) so
  both create and update paths enforce them.
- Pagination with stable cursors on page, folder, canvas, review, and activity
  listings. The current list endpoints in `apps/api/src/routes/*.ts` return
  everything.
- **Replace the raw `to_tsquery` construction** in `apps/api/src/routes/pages.ts`
  (the `/search` route builds `query.trim().split(/\s+/).join(" & ")` and feeds
  it to `to_tsquery`). Use `websearch_to_tsquery` or `plainto_tsquery` so
  punctuation and malformed terms can't throw. This route already had a stored-XSS
  fix in phase 1 on the render side; this is the query side.
- Add a proper GIN full-text index (currently `pages_search_idx` is a plain btree
  on `searchable_text`; see `schema.ts`). This is a migration, so coordinate with
  phase 4 ordering.
- Convert malformed JSON, DB errors, and provider errors into stable error
  envelopes (consistent shape, no stack traces to clients).
- Request IDs + structured logs with redaction. The redacting access logger from
  phase 3 is in `apps/api/src/lib/logging.ts`; extend it, don't replace it.
- DB, provider, and outbound-request timeouts.
- Separate liveness (`/health` exists) from DB-aware readiness (`/ready` that
  actually checks the database).
- Server-side dashboard fetch in `apps/sketch-forge/src/api/server.ts` currently
  swallows every failure into an empty array (`getDashboardData` catches and
  returns `[]`). Make an outage show an outage state, not an empty library.

### Owned files

- `apps/api/src/routes/*.ts`, `apps/api/src/index.ts`, `apps/api/src/lib/*`
- `packages/schema/src/*.ts` for the bounds
- `apps/sketch-forge/src/api/server.ts` for the outage state
- migration files for the GIN index (respect phase 4)

### Completion gate

- Oversized and malformed requests fail predictably (test them).
- Search punctuation / malformed terms cannot 500 (test with `"foo & | bar"`, etc.).
- Pagination stays stable while rows are inserted.
- Readiness fails when the DB is down; liveness stays up.

### Notes

Any list-endpoint response shape change ripples into
`apps/sketch-forge/src/api/client.ts`, `types.ts`, and `hooks.ts`. Update the web
types in the same phase or the build breaks.

---

## Phase 7: Make persistence and autosave data-safe (P1)

### Current defects

- Any entity load error can trigger creating a new blank entity.
- Saves are last-write-wins with no revision/conflict contract.
- Multiple in-flight saves can land out of order.
- Save errors aren't surfaced as recoverable state.
- Note edits regenerate both thumbnails unnecessarily.

### Contract

1. Create a new entity only when the URL has no entity id. Look at the canvas
   editor flow in `apps/sketch-forge/src/app/canvas/page.tsx` and
   `apps/sketch-forge/src/features/canvas/hooks/useCanvasSync.ts`.
2. Distinguish 401 / 403+404 / network / server failure in the editor.
3. Add a monotonic revision or `updatedAt` precondition to page/canvas updates.
   Server rejects a stale write with a conflict status; client surfaces it.
4. Serialize or coalesce saves so an older response can't overwrite newer state.
5. Keep an unsaved local recovery draft until the server confirms the revision.
6. Flush on explicit navigation and `pagehide`; don't rely on an async fetch
   during `visibilitychange`.
7. Split content-only, metadata-only, and thumbnail-generating save paths.
8. Generate thumbnails only when visual canvas content changed.
9. Expose a quiet but actionable failure/conflict state.

### Owned files

- `apps/sketch-forge/src/app/canvas/page.tsx`
- `apps/sketch-forge/src/features/canvas/hooks/useCanvasSync.ts`
- `apps/sketch-forge/src/api/client.ts`
- `apps/api/src/routes/pages.ts` and `canvases.ts` for the revision precondition
- `packages/schema/src/page.ts` if a revision field is added
- migration for a revision column (respect phase 4)

### Required tests

- Transient load failure never creates a page.
- Invalid/foreign id never creates a page.
- Rapid edits + delayed responses keep the newest content.
- Two-tab conflict doesn't silently overwrite.
- Navigation/reload preserves the latest acknowledged or recoverable draft.
- Note-only saves don't invoke thumbnail generation.

### Completion gate

All six test cases above pass. The API revision check has integration coverage
against the test database.

---

## Phase 8: Integration, browser, and CI gates (P1)

### Contract

- Export an API app factory so routes are testable without binding a port.
  (Phase 2/3 tests already build a `new Hono().route(...)` inline; consider
  promoting that to a shared factory in `apps/api/src`.)
- Isolated Postgres integration tests for auth, ownership, migrations, search,
  CRUD. Auth and ownership already exist (`apps/api/src/routes/auth.test.ts`,
  `ownership.test.ts`); fill the gaps.
- Playwright journeys: magic-link + Google callback with test doubles; session
  expiry/logout; folder/page create+move; canvas create/draw/save/reload/delete;
  autosave failure+recovery; search highlighting with malicious text; Quick
  Capture; desktop + mobile critical paths.
- Commit the CI workflow (a `.github/workflows/ci.yml` already exists untracked;
  review it before trusting it).
- CI jobs: migrate-from-empty, dependency audit, secret scan, Docker build.
- Pin GitHub Actions to commit SHAs, not tags.
- Branch protection requiring the production gate.

### Owned files

- `apps/api` test factory, new test files
- `.github/workflows/*`
- Playwright config + specs (new top-level `e2e/` or per-app)
- root `package.json` scripts for the new test runners

### Completion gate

- CI runs from a clean checkout with no developer `.env`.
- Every P0 security regression has an automated test.
- A failed migration, audit, integration test, or browser journey blocks merge.

### Notes

CI must provision its own throwaway Postgres (service container) and set
`TEST_DATABASE_URL` to a `_test` database. Mirror the local setup section above.

---

## Phase 9: Harden deployment and operations (P1)

### Container / network

- Exclude from Docker build context: the ~729MB `*-openclaw-backup.tar.gz` at
  repo root, backups, local agent state, tests, dev artifacts. Add/extend
  `.dockerignore`.
- Next.js standalone output (or equivalently minimal runtime image).
- Run web and API as non-root.
- Pin base images to immutable digests at release time.
- API liveness/readiness (readiness from phase 6) and web health checks.
- Service startup depends on readiness where supported.
- One public origin, TLS at a documented reverse proxy. The phase-3 evidence
  already specifies the Caddy config and the single-origin layout for the VPS;
  reuse it.
- CPU/memory/restart/rollout limits in the deploy platform.

### Application ops

- Security headers: CSP, HSTS, `X-Content-Type-Options`, frame protection,
  Referrer-Policy, Permissions-Policy. Disable `X-Powered-By` (the live site
  currently sends `x-powered-by: Next.js`).
- Error monitoring, structured logs, request correlation, latency/error metrics,
  alert thresholds.
- Backup frequency, retention, encryption, restore ownership, RPO, RTO.
- Run and record a restore drill.
- Document deploy, migration, rollback, incident, secret-rotation procedures.
  (Secret rotation for sessions is already implemented: rotate `JWT_SECRET` with
  the old value in `JWT_SECRET_PREVIOUS`; document that.)

### Owned files

- `docker-compose.yml`, `apps/*/Dockerfile`, `.dockerignore`
- `apps/sketch-forge/next.config.*` (headers, standalone output)
- `apps/api/src/index.ts` for security headers on API responses
- ops docs under `docs/`

### Completion gate

- Staging deploys from a clean commit + immutable image.
- Health checks, alerts, rollback, backup, restore demonstrated.
- No local backup or secret in build context or image layers.

### Notes

This phase largely can't be *fully* completed without access to the VPS and the
deploy platform. Do the in-repo parts (dockerignore, headers, standalone,
non-root, health endpoints, docs) and clearly mark the infra steps that need the
human on the server.

---

## Phase 10: Reconcile product model and launch quality (P2)

### Page-model work

- Replace switchable `viewMode: "doc" | "canvas"` with immutable
  `kind: "note" | "canvas"`. `viewMode` is in `packages/db/src/schema.ts`
  (`pages.view_mode`) and `packages/schema/src/page.ts` (`PageViewModeSchema`).
  This is a schema + migration change; respect phase 4.
- Migrate creation flows, dashboard cards, folder views, notebook sidebar,
  command palette, empty states.
- Move canvas notes to canonical shape metadata with clipboard, duplicate,
  undo/redo, delete, search, persistence coverage.
- No inline diagrams until the fixed page-kind + shape-note slice passes.
- Decide the fate of the legacy standalone `canvases` table (keep as scratch
  surface, or migrate into pages). Don't maintain two content models forever.

### Product-truth work

- Either implement PNG/SVG/JSON export or remove those public claims.
- Either implement a real offline queue/conflict model or drop the offline-first
  claim.
- Resolve "No account required" vs protected `/canvas` and `/capture` routes.
- Update the web manifest to match actual product + auth behavior.
- Add privacy + terms surfaces before sending user content to third-party AI
  providers in a public launch. (Note: a Gemini API key was being stored in
  `localStorage`; check that's resolved.)

### Accessibility work

- Keyboard-focusable canvas + accessible text representation.
- Accessible names on every icon-only control.
- Focus trap, Escape, labelled fields, focus return for dialogs/drawers.
- Visible focus, contrast, non-color status cues, reduced motion, zoom/reflow,
  touch target size.
- Automated a11y checks + manual keyboard and screen-reader journeys.

### Completion gate

- Public claims match shipped behavior.
- The agreed page model is implemented end to end.
- Critical flows meet WCAG 2.2 AA.
- Staging passes desktop, mobile, keyboard, screen-reader, failure-recovery,
  security, and restore checks.

### Notes

This is the largest and most product-shaped phase. It is mock-first for all UI.
Split it with the human before starting; it is not a single-agent one-shot.

---

## Appendix: quick file map

| Area | Path |
| --- | --- |
| API entry / middleware wiring | `apps/api/src/index.ts` |
| API routes | `apps/api/src/routes/{auth,pages,folders,canvases,stats}.ts` |
| API libs (env, jwt, cookies, rateLimit, logging, email, oauth, ownership) | `apps/api/src/lib/*.ts` |
| Auth middleware / origin guard | `apps/api/src/middleware/*.ts` |
| API test setup + config | `apps/api/test/setup.ts`, `apps/api/bunfig.toml` |
| DB schema | `packages/db/src/schema.ts` |
| Migrations | `packages/db/drizzle/*.sql` + `meta/_journal.json` |
| Shared zod schemas | `packages/schema/src/*.ts` |
| Web API client (browser) | `apps/sketch-forge/src/api/client.ts` |
| Web API client (server) | `apps/sketch-forge/src/api/server.ts` |
| Web API config (origin + cookie name) | `apps/sketch-forge/src/api/config.ts` |
| Web auth gate | `apps/sketch-forge/src/middleware.ts` |
| Canvas editor + autosave | `apps/sketch-forge/src/app/canvas/page.tsx`, `apps/sketch-forge/src/features/canvas/hooks/useCanvasSync.ts` |
| Env reference | `.env.example` |
| Turbo config (globalEnv) | `turbo.json` |
| Compose | `docker-compose.yml` |
