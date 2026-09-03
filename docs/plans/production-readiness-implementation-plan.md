# Sketch Forge Production-Readiness Implementation Plan

**Status:** Active  
**Created:** 2026-08-26  
**Repository:** `/Users/ankittripathi/Developer/sketch-forge`  
**Primary branch at creation:** `main`  
**Baseline commit:** `259ff80`  
**Purpose:** Operational handoff for taking Sketch Forge from a working beta codebase to a production-ready application.

## How to use this document

This file is the implementation source of truth for production-readiness work.

1. Read this entire document before editing anything.
2. Inspect `git status --short` before every phase. The repository contains inherited work that must not be reset, cleaned, staged, committed, or overwritten.
3. Implement exactly one unchecked phase at a time.
4. Run that phase's focused checks and completion gate.
5. Update the phase status and evidence in this document only after the gate passes.
6. Stop after the phase. Do not begin the next phase in the same session unless the user explicitly asks.
7. Do not commit or push unless the user explicitly requests it.

If current code conflicts with this document, stop and record the conflict. Do not silently redesign the plan.

## Status legend

- `[x]` completed and verified
- `[~]` in progress
- `[ ]` not started
- `[!]` blocked by a decision or external dependency

## Verified baseline

The 2026-08-26 audit verified the following against the current working tree:

- `bun run test`: 92 passing tests across 17 files.
- `bun run test:coverage`: 93.63% line coverage across measured modules.
- Fresh lint and type checks pass with `bunx turbo run lint check-types --force`.
- `bun run build` passes for the API and Next.js app.
- `git diff --check` passes.
- `bun audit`: 69 known vulnerabilities: 27 high, 37 moderate, and 5 low.
- The branch is three commits ahead of `origin/main`.
- The working tree contains 30 tracked changes and 26 untracked files.
- `.github/workflows/ci.yml`, the newest migration, multiple tests, and the notes implementation are untracked.
- A 729 MB OpenClaw backup archive is inside the repository directory and is not excluded from Docker build context.
- No application server was running before the audit. The built web server was started briefly for local response checks and then stopped.
- Docker is not installed on the audit host, so container builds were not executed.

## Settled product and architecture decisions

Preserve these decisions unless the user explicitly changes them:

- Sketch Forge remains a Bun-managed TypeScript Turborepo.
- User data must be isolated by authenticated user at both route and database boundaries.
- Public web and API traffic should use one public origin, preferably with `/api` reverse-proxied to the API service. Do not depend on a host-only API cookie being visible to a different web hostname.
- Pages have an immutable kind: `"note"` or `"canvas"`.
- A canvas page contains an infinite canvas and notes attached to individual shapes.
- A note page is a keyboard-first document and may gain inline diagram blocks later.
- Do not retain a switchable `viewMode: "doc" | "canvas"` model.
- Do not add page-level notes to canvas pages.
- Autosave remains visually quiet, but failures and unresolved conflicts must be visible and recoverable.
- Application code owns authentication, persistence, authorization, redirects, rate limits, and server-side validation.

## Global implementation rules

- Prefer small direct fixes over new frameworks or broad abstractions.
- Never use `git reset`, `git clean`, destructive checkout commands, or bulk staging.
- Do not rewrite applied database migrations until production migration state is known.
- Do not print secrets, tokens, magic links, database URLs, or user content in test output.
- Use transactions when an authorization check and mutation must remain atomic.
- Return `404` for resources the current user does not own unless a different behavior is explicitly required.
- Add focused tests for security boundaries and data-loss fixes. Do not chase a coverage percentage by testing trivial lines.
- Use the existing package boundaries before adding dependencies.
- For any non-trivial visual, layout, or landing-page copy change, follow the repository's mock-first design rule and wait for a user selection before editing production UI.

## Release gate overview

| Phase | Priority | Outcome                                                                     | Status |
| ----- | -------: | --------------------------------------------------------------------------- | ------ |
| 0     |       P0 | Preserve baseline and establish safe execution rules                        | [x]    |
| 1     |       P0 | Remove stored-XSS search rendering                                          | [x]    |
| 2     |       P0 | Enforce tenant ownership for every relationship                             | [x]    |
| 3     |       P0 | Harden authentication, cookies, rate limits, and environment validation     | [~]    |
| 4     |       P0 | Repair and prove database migrations                                        | [x]    |
| 5     |       P0 | Remove known vulnerable runtime dependencies                                | [x]    |
| 6     |       P1 | Add request limits, reliable search, pagination, and API error handling     | [ ]    |
| 7     |       P1 | Make autosave and concurrent editing data-safe                              | [ ]    |
| 8     |       P1 | Commit a real integration, browser, and CI quality system                   | [ ]    |
| 9     |       P1 | Harden deployment, observability, backups, and recovery                     | [ ]    |
| 10    |       P2 | Reconcile product model, public claims, accessibility, and launch readiness | [ ]    |

---

## Phase 0: Preserve the baseline

**Status:** `[x]` completed during the 2026-08-26 audit.

### Completion evidence

- Working-tree state recorded without modifying inherited files.
- Current quality gates, dependency audit, deployment files, migration ordering, authentication, authorization, and product claims reviewed.
- No source changes, commits, pushes, migrations, or destructive cleanup were performed during the audit.

### Continuing guardrail

At the beginning and end of every later phase, run:

```bash
git status --short
git diff --check
```

State clearly which files the phase changed and whether they are staged, committed, or pushed.

---

## Phase 1: Remove stored-XSS search rendering

**Status:** `[x]` completed and verified on 2026-08-26.

### Problem

PostgreSQL search headlines contain user-controlled page and note text. `CommandPalette.tsx` currently renders the returned snippet through `dangerouslySetInnerHTML`. Raw HTML in a note or text element can therefore execute in the application origin. This is compounded by the Gemini API key being stored in `localStorage`.

### Owned files

- `apps/sketch-forge/src/features/dashboard/components/CommandPalette.tsx`
- `apps/sketch-forge/src/features/dashboard/components/SearchSnippet.tsx`
- `apps/sketch-forge/src/features/dashboard/components/SearchSnippet.test.tsx`
- This plan file, for status/evidence only

Do not modify the search SQL during this phase unless the existing `<mark>` contract cannot be consumed safely.

### Implementation contract

1. Remove the `dangerouslySetInnerHTML` call.
2. Treat all snippet content as text rendered by React.
3. Recognize only the exact `<mark>` and `</mark>` tokens generated by `ts_headline`.
4. Render recognized highlighted segments with a React `<mark>` element.
5. Render every other tag-like value as escaped text.
6. Preserve whitespace, ordering, truncation, and the existing compact visual hierarchy.
7. Add a server-render regression test proving that `<img onerror>`, `<script>`, and other supplied markup are escaped and cannot become DOM elements.
8. Add parsing coverage for plain text, highlighted text, multiple highlights, and malformed/unclosed markers.

### Focused verification

```bash
bun test apps/sketch-forge/src/features/dashboard/components/SearchSnippet.test.tsx
rg -n "dangerouslySetInnerHTML" apps/sketch-forge/src
bunx turbo run lint check-types --force
git diff --check
```

Expected result:

- Focused tests pass.
- The `rg` search returns no application call sites.
- Lint and type checks pass without cache.
- The working tree contains only inherited changes plus the Phase 1 files.

### Completion gate

- Malicious snippet markup is escaped in a rendered-output test.
- Search highlights remain visible through React `<mark>` nodes.
- There is no remaining `dangerouslySetInnerHTML` application call site.

Stop after this gate. Do not begin tenant-ownership work in the same session without explicit user direction.

### Completion evidence

```text
Status: completed
Files changed:
- apps/sketch-forge/src/features/dashboard/components/CommandPalette.tsx
- apps/sketch-forge/src/features/dashboard/components/SearchSnippet.tsx
- apps/sketch-forge/src/features/dashboard/components/SearchSnippet.test.tsx
- docs/plans/production-readiness-implementation-plan.md
Tests run:
- bun test apps/sketch-forge/src/features/dashboard/components/SearchSnippet.test.tsx
- bun run test
- bunx turbo run lint check-types --force
- bun run build
- git diff --check
Results:
- Focused security tests: 4 passed, 0 failed.
- Full workspace tests: 96 passed, 0 failed.
- Fresh lint and type checks: 12 tasks passed, 0 cached.
- API and Next.js production builds passed.
- No dangerouslySetInnerHTML call remains under apps/sketch-forge/src.
Manual verification: not required for this non-visual security slice; rendered static markup was verified in the regression test.
Known limitations: the production build still reports the pre-existing Next.js middleware deprecation and dashboard dynamic-server diagnostics.
Staged: no
Committed: no
Pushed: no
Next unchecked phase: Phase 2, tenant ownership for relationships
```

---

## Phase 2: Enforce tenant ownership for relationships

**Status:** `[x]` completed and verified on 2026-08-26.

### Problem

Page `folderId` and folder `parentId` inputs are validated as UUIDs but not as resources owned by the authenticated user. This permits cross-user relationships and can expose or inject data through relational queries.

### Owned files

- `apps/api/src/routes/pages.ts`
- `apps/api/src/routes/folders.ts`
- A small ownership helper under `apps/api/src/lib/` only if it removes repeated checks
- API integration test files introduced by this phase
- Database schema/migration files only after the API boundary is passing

### Implementation contract

1. For page create and page move/update, verify the destination folder exists and belongs to `userId`.
2. For folder create and folder reparent, verify the parent exists and belongs to `userId`.
3. Reject self-parenting and ancestry cycles.
4. Keep authorization check and mutation in the same database transaction.
5. Add two-user tests covering create, move, reparent, read-through relations, and deletion behavior.
6. Return `404` for a foreign destination so the API does not disclose its existence.
7. Add database constraints for same-tenant relationships if they can be introduced safely after Phase 4 establishes migration history.

### Required test cases

- User A cannot create a page in User B's folder.
- User A cannot move a page into User B's folder.
- User A cannot create or move a folder under User B's folder.
- User A cannot create a folder cycle.
- Valid same-user nesting and page moves still work.
- Folder-detail relation loading never returns another user's page.

### Completion gate

```bash
bun test <phase-2-api-test-files>
bunx turbo run lint check-types --force
bun run build
git diff --check
```

Stop if no isolated test database is available. Do not substitute mocked ownership tests for real database integration coverage.

### Test database

The integration tests need an isolated PostgreSQL database whose name ends with `_test`. `apps/api/test/setup.ts` refuses to run against anything else and points DATABASE_URL at it before `@repo/db` is imported.

```bash
createdb sketchforge_test
# from packages/db, because the committed migration chain is still broken (Phase 4)
DATABASE_URL=postgres://<user>@127.0.0.1:5432/sketchforge_test bunx drizzle-kit push --force
# from apps/api
TEST_DATABASE_URL=postgres://<user>@127.0.0.1:5432/sketchforge_test bun run test:integration
```

`test:integration` is deliberately not wired into the Turbo `test` task yet: the default suite must stay runnable without a database until Phase 8 provisions PostgreSQL in CI.

### Completion evidence

```text
Status: completed
Files changed:
- apps/api/src/lib/ownership.ts (new: ownsFolder, createsFolderCycle)
- apps/api/src/routes/pages.ts (transactional folder-ownership checks on create and move)
- apps/api/src/routes/folders.ts (transactional parent-ownership and cycle checks; userId-filtered detail relations)
- apps/api/src/routes/ownership.test.ts (new: 13 two-user integration tests)
- apps/api/test/setup.ts (new: test database selection and `_test` name guard)
- apps/api/bunfig.toml (new: test preload)
- apps/api/package.json (new `test:integration` script)
- turbo.json (declare DATABASE_URL and TEST_DATABASE_URL in globalEnv)
- docs/plans/production-readiness-implementation-plan.md
Tests run:
- bun run test:integration (apps/api, against sketchforge_test)
- bun run test
- bunx turbo run lint check-types --force
- bun lint
- bun check-types
- bun run build
- git diff --check
Results:
- Ownership integration tests: 13 passed, 0 failed, 63 assertions.
- Mutation check: with ownsFolder and createsFolderCycle neutered, 6 of the 13 fail. The suite proves the guarantees rather than the code path.
- Full workspace tests: 96 passed, 0 failed across 17 files (unchanged by this phase).
- Fresh lint and type checks: 12 tasks passed, 0 cached.
- API and Next.js production builds passed.
- git diff --check clean.
Manual verification: not required; this is a non-visual API boundary change proven by real-database tests.
Known limitations:
- Contract item 7 (same-tenant database constraints) is deferred to Phase 4 as the contract allows. The committed migration chain cannot initialize a clean database yet, so no migration was added.
- The test database schema is created with `drizzle-kit push`, not by replaying migrations. Phase 4 replaces this once migration history is repaired.
- Legacy cross-tenant rows written before this phase are hidden by the folder-detail relation filters but are not deleted or repaired.
- Route params are still not UUID-validated, so a malformed :id yields a 500. Phase 6 owns error envelopes.
Staged: no
Committed: no
Pushed: no
Next unchecked phase: Phase 3, harden authentication and environment configuration
```

---

## Phase 3: Harden authentication and environment configuration

**Status:** `[~]` code complete and verified on 2026-08-26. The completion gate is **not** met: the staging login check needs a reverse-proxy and environment change on the VPS that cannot be made from the repository. See "Blocked" below.

### Answers to the required decisions

Recorded 2026-08-26 from the live deployment at `https://sketch-forge.duckdns.org` (Hostinger VPS, TLS terminated by a reverse proxy with HTTP/3 advertised).

**Public origin and callback URL.** Single origin, per the settled decisions:

```
PUBLIC_ORIGIN   = https://sketch-forge.duckdns.org
API_PUBLIC_URL  = https://sketch-forge.duckdns.org/api
google callback = https://sketch-forge.duckdns.org/api/auth/google/callback
```

Observed before the change: web on `sketch-forge.duckdns.org`, API on a separate `sketch-forge-api.duckdns.org`, plus the API exposed unencrypted on `http://sketch-forge.duckdns.org:4001`. `/api/*` was not proxied and 404'd from Next. The session cookie was host-only on the API hostname, so `apps/sketch-forge/src/middleware.ts` could never see it, and `Domain=.duckdns.org` is impossible because `duckdns.org` is on the Public Suffix List.

**Rate limiting.** In the API, in-process. One VPS, one API container, no shared store. Counters reset on restart and do not coordinate across replicas; move them to a shared store before running a second instance. Limits key on the client address, which only becomes trustworthy once `TRUST_PROXY=1` **and** port 4001 is closed to the internet.

**Email domain and sender.** Unresolved, and blocking real magic-link delivery. `EMAIL_FROM` is now configurable and required in production, but the value cannot be a `duckdns.org` subdomain: DuckDNS serves only A/AAAA plus one ACME TXT record, so Resend's DKIM record cannot be created and the domain cannot be verified. The previous `onboarding@resend.dev` sandbox sender only delivers to the Resend account owner. A domain with controllable DNS is required.

### Required decisions before editing

- Confirm the production public origin and callback URL.
- Confirm whether rate limiting is provided by the deployment edge, a shared store, or the API.
- Confirm the production email domain and sender.

If these values are unavailable, implement typed validation and tests but stop before inventing production domains.

### Owned areas

- `apps/api/src/lib/env.ts` or equivalent typed environment module
- `apps/api/src/lib/jwt.ts`
- `apps/api/src/lib/oauth.ts`
- `apps/api/src/lib/email.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/index.ts`
- `apps/sketch-forge/src/api/config.ts`
- Authoritative root `.env.example`
- Auth integration tests

### Implementation contract

1. Validate all required environment variables at startup and fail with variable names, never values.
2. Remove localhost callback and capture URLs from production paths.
3. Use one public origin or a documented cookie-domain strategy.
4. Define one shared cookie-options helper with `httpOnly`, production `secure`, explicit `sameSite`, `path`, lifetime, and a production-safe cookie name.
5. Clear cookies using matching options.
6. Add JWT issuer and audience checks and define a rotation/revocation strategy.
7. Stop logging emails, tokens, magic links, and provider response payloads.
8. Make magic links single-use under concurrency and clean up expired tokens.
9. Rate-limit login, verification, OAuth initiation, and repeated failures.
10. Verify Google email claims, safely link an existing verified email account, and enforce unique `(provider, providerAccountId)`.
11. Add Origin/CSRF protection for cookie-authenticated state changes.
12. Replace the Resend test sender with a configurable verified sender.

### Required tests

- Missing or weak secrets prevent startup.
- Production cookies include the chosen secure attributes.
- OAuth state mismatch and missing verifier fail.
- A magic link cannot be redeemed twice, including concurrent requests.
- Google login links to an existing verified user instead of violating email uniqueness.
- Login throttling works without leaking whether an account exists.
- Cross-origin mutation attempts fail.

### Completion gate

- Auth tests pass against a real isolated database.
- No token, email, link, or secret is emitted in logs.
- A staging login works through the same public origin used by the web app.

### Gate status

| Gate item                                        | Status                                              |
| ------------------------------------------------ | --------------------------------------------------- |
| Auth tests pass against a real isolated database | met: 65 tests against `sketchforge_test`            |
| No secret emitted in logs                        | met: verified by test and by a live boot            |
| Staging login through the shared public origin   | **not met**: needs VPS proxy and environment change |

### Blocked

The third gate item cannot be satisfied from the repository. It needs, on the VPS:

1. Reverse-proxy `/api/*` on `sketch-forge.duckdns.org` to the API container, stripping the prefix. Caddy:

   ```
   sketch-forge.duckdns.org {
     handle_path /api/* {
       reverse_proxy api:4001
     }
     handle {
       reverse_proxy web:3000
     }
   }
   ```

2. Set the renamed variables (see `.env.example`): `PUBLIC_ORIGIN`, `API_PUBLIC_URL`, `TRUST_PROXY=1`, `EMAIL_FROM`, and `NEXT_PUBLIC_API_URL=/api`. `FRONTEND_URL`, `CORS_ORIGINS`, and `API_URL` are gone; the API refuses to boot without the new ones.
3. Close port 4001 to the internet and retire `sketch-forge-api.duckdns.org`.
4. Register `https://sketch-forge.duckdns.org/api/auth/google/callback` in the Google Cloud console.
5. Verify a sending domain in Resend and set `EMAIL_FROM` to an address on it. Not possible on duckdns.

Deploying this phase logs every existing user out: session tokens now require `iss`/`aud`, and the production cookie is renamed to `__Host-session`.

### Completion evidence

```text
Status: blocked on the staging-login gate item; implementation complete and verified
Files changed:
- apps/api/src/lib/env.ts (new: typed startup validation, names-only failures)
- apps/api/src/lib/env.test.ts (new)
- apps/api/src/lib/cookies.ts (new: one cookie-options helper, __Host- prefix in production)
- apps/api/src/lib/cookies.test.ts (new)
- apps/api/src/lib/rateLimit.ts (new: in-process limiter, proxy-aware client address)
- apps/api/src/lib/logging.ts (new: access log that redacts credential query parameters)
- apps/api/src/lib/logging.test.ts (new)
- apps/api/src/lib/googleAccount.ts (new: transactional provider-account resolution)
- apps/api/src/lib/jwt.ts (issuer/audience/jti, previous-secret rotation)
- apps/api/src/lib/oauth.ts (env-derived redirect URI, optional Google)
- apps/api/src/lib/email.ts (configurable sender, no credential logging, expiry cleanup)
- apps/api/src/routes/auth.ts (atomic magic-link redemption, rate limits, verified-email linking)
- apps/api/src/routes/auth.test.ts (new: 30 integration tests)
- apps/api/src/middleware/auth.ts (shared cookie name and verifier)
- apps/api/src/middleware/originGuard.ts (new: cross-origin rejection on unsafe methods)
- apps/api/src/index.ts (env import, redacting logger, single-origin CORS, origin guard)
- apps/api/src/routes/ownership.test.ts (updated to the new jwt/cookie helpers)
- apps/api/test/setup.ts (new required test variables)
- apps/sketch-forge/src/api/config.ts (same-origin default, shared session cookie name)
- apps/sketch-forge/src/api/config.test.ts (new)
- apps/sketch-forge/src/middleware.ts (reads the shared cookie name)
- apps/sketch-forge/src/app/capture/page.tsx (hardcoded localhost:4001 removed)
- .env.example (new, authoritative)
- docker-compose.yml (renamed variables, api port bound to loopback)
- turbo.json (globalEnv updated to the new variable set)
- docs/plans/production-readiness-implementation-plan.md
Tests run:
- bun run test:integration (apps/api, against sketchforge_test)
- bun run test
- bunx turbo run lint check-types --force
- bun run build
- git diff --check
- live boot of the API with a valid environment, and with an empty one
Results:
- API tests: 65 passed, 0 failed, 176 assertions across 5 files.
- Mutation check: neutering the origin guard, the issuer/audience check, and
  atomic magic-link redemption fails 6 tests. The suite proves the guarantees.
- Full workspace tests: 99 passed, 0 failed.
- Fresh lint and type checks: 12 tasks passed, 0 cached.
- API and Next.js production builds passed.
- Empty environment: startup refused, naming PUBLIC_ORIGIN and API_PUBLIC_URL, no values echoed.
- Valid environment: /health 200, and the access log rendered
  `GET /auth/verify?token=%5Bredacted%5D 302`.
Manual verification: live probe of the deployment recorded above. The staging
login itself was not exercised; it needs the proxy change listed under Blocked.
Known limitations:
- A unique (provider, providerAccountId) database constraint is still deferred to
  Phase 4; the pair is enforced transactionally in application code for now.
- Revocation is global only: rotate JWT_SECRET without JWT_SECRET_PREVIOUS.
  Per-session revocation needs a schema change, so it waits for Phase 4.
- Request body limits, error envelopes, and structured request IDs are Phase 6.
- The web app's `apps/sketch-forge/src/api/server.ts` keeps an internal-network
  localhost fallback, which is not a production path.
- Local `apps/api/.env` was deliberately not edited; it still holds the old
  variable names and needs PUBLIC_ORIGIN and API_PUBLIC_URL added.
Staged: no
Committed: no
Pushed: no
Next unchecked phase: Phase 4, repair and prove database migrations
```

---

## Phase 4: Repair and prove database migrations

**Status:** `[x]` completed and verified on 2026-08-26. Production was not migrated from this machine.

### Current defect

Migration `0001_page_theme_thumbnails.sql` altered `pages` before migration `0002_mixed_master_chief.sql` created it. That chain cannot initialize a clean database.

### Mandatory discovery gate

Before editing migrations, determine and record:

- Whether any production database contains user data.
- Whether Drizzle migrations were applied or the schema was created with `push`.
- The rows in `drizzle.__drizzle_migrations`, if the table exists.
- The current production columns, indexes, constraints, and enum values.
- A verified backup and restore point.

Never place database credentials in this document or terminal output.

### Discovery findings (2026-08-26)

Recorded without printing credentials.

- The only production URL in `packages/db/.env` is a commented Supabase pooler host (`ksjchpfrpgzonleomhkc`). `prod-migrate.sh check` failed with tenant/user not found. That project is gone.
- Active `DATABASE_URL` values in this repo point at localhost only.
- The human confirmed the live VPS database is throwaway and may be deleted. Path taken: one clean baseline from `schema.ts`.

### Recommended path

- If there is no production user data: regenerate one clean baseline migration from the intended schema and test it from an empty database.
- If production data exists: do not rewrite applied history. Create a reviewed reconciliation procedure that preserves the live schema and independently establishes a clean-install path. Stop for user approval before applying it.

### Required verification

1. Empty PostgreSQL database migrates to the latest schema.
2. Existing production-shaped fixture migrates without data loss.
3. Application CRUD and auth integration tests pass against the migrated schema.
4. Expected indexes and foreign keys exist.
5. Migration is idempotently recorded and does not rerun.
6. Backup restoration is tested before any production apply.

### Completion gate

- Clean install and upgrade paths both pass in automation.
- Migration execution is part of deployment, not a developer-only script reading a local `.env` comment.

### Completion evidence

```text
Status: completed
Files changed:
- packages/db/src/schema.ts (unique index on oauth_accounts(provider, providerAccountId))
- packages/db/src/migrate.ts (new: applyMigrations used by CLI and the API image)
- packages/db/src/migrate.test.ts (new: empty-db, idempotent, fixture, unique-index tests)
- packages/db/drizzle/0000_yummy_bucky.sql and meta (single baseline)
- packages/db/drizzle-archive/** (broken 0000-0003 history, do not apply)
- packages/db/package.json (db:migrate runs bun src/migrate.ts; test:migrations)
- packages/db/scripts/prod-migrate.sh (check only; apply removed)
- apps/api/Dockerfile and apps/api/entrypoint.sh (migrate on container start)
- apps/api/test/setup.ts (bootstrap text now uses migrate, not push)
- docker-compose.yml (note that the API image migrates on start)
- .env.example (migrate instructions for the test database)
- docs/plans/production-readiness-implementation-plan.md
Tests run:
- bun test src/migrate.test.ts (packages/db, against sketchforge_test)
- drizzle-kit push on a separate empty database: schema fingerprint matched migrate
- bun run test:integration (apps/api, against the migrated schema)
- bun run test
- bunx turbo run lint check-types --force
- bun run build
- git diff --check
Results:
- Migration tests: 4 passed, 0 failed.
- Schema after migrate matches schema after push (columns, indexes, foreign keys).
- API tests: 65 passed, 0 failed against the migrated schema.
- Workspace tests: 7 package test tasks passed.
- Fresh lint and type checks: 12 tasks passed, 0 cached.
- API and Next.js production builds passed.
- git diff --check clean.
Manual verification: not required for this non-visual schema/deploy-wiring change.
Known limitations:
- Same-tenant CHECK constraints were not added; the handoff requires a separate human go-ahead.
- Per-session revocation is still not in the schema.
- This machine did not apply migrations to the VPS. The baseline is CREATE TABLE, so the first production deploy must start from an empty database (drop public and drizzle, or recreate the database). Do not run this baseline against leftover push-created tables.
- Backup/restore of production was skipped because the human confirmed the data is disposable.
- test:migrations is not on the Turbo test task; it still needs TEST_DATABASE_URL, same as API integration tests.
Staged: no
Committed: no
Pushed: no
Next unchecked phase: Phase 5, remove vulnerable runtime dependencies
```

---

## Phase 5: Remove vulnerable runtime dependencies

**Status:** `[x]` completed and verified on 2026-08-26.

### Implementation contract

1. Remove unused root dependencies before updating them. `axios` and root-level `oslo` were not imported during the audit.
2. Update direct vulnerable runtime packages in small groups, starting with Next.js and Hono.
3. Update Turbo and build tooling separately from runtime packages.
4. Regenerate `bun.lock` only through scoped Bun package operations.
5. Review breaking changes and migration notes from primary package documentation.
6. Run the complete gate after every dependency group.
7. Classify any residual advisory as runtime-reachable, build-only, or false positive; do not dismiss it only because it is transitive.

### Completion gate

```bash
bun run test
bun run test:coverage
bunx turbo run lint check-types --force
bun run build
bun audit
git diff --check
```

Expected result: zero known high-severity runtime vulnerabilities and a documented reason for any remaining development-only advisory.

### Completion evidence

```text
Status: completed
Files changed:
- package.json (removed unused root axios/oslo/arctic/zustand; Turbo 2.9.14; coverage script scoped off API integration tests; overrides for nanoid, brace-expansion, js-yaml, postcss; CodeMirror pins kept)
- bun.lock (regenerated via bun add/remove only)
- apps/sketch-forge/package.json (next 16.3.3, postcss 8.5.26)
- apps/api/package.json (hono 4.12.34)
- docs/plans/production-readiness-implementation-plan.md
Tests run:
- bunx turbo run lint check-types --force
- bun run test
- bun run test:coverage
- bun run build
- bun audit
- git diff --check
Results:
- Lint and type checks: 12 tasks passed.
- Workspace tests: 7 package test tasks passed.
- Coverage: 98 passed, 4 skipped (migration tests without TEST_DATABASE_URL), 0 failed; 91.87% lines on measured modules.
- API and Next.js production builds passed (Next.js 16.3.3).
- bun audit: 2 remaining (1 moderate, 1 low). Zero high.
- git diff --check clean.
Manual verification: not required; no application source or visual components were edited.
Known limitations:
- Remaining advisories are esbuild 0.18 via drizzle-kit's @esbuild-kit loader. That is a CLI/devDependency of @repo/db. The reports are about the esbuild development server, which production web/API containers never start. A global esbuild override would break that loader's ~0.18 pin.
- test:coverage now runs packages/ and apps/sketch-forge only. API integration tests still require TEST_DATABASE_URL and bunfig preload; they stay on test:integration until Phase 8.
- Next.js still warns that middleware should migrate to proxy. That is a 16.x deprecation, not a security patch, and is left for a later UI/routing phase.
Staged: no
Committed: no
Pushed: no
Next unchecked phase: Phase 6, bound and stabilize the API
```

---

## Phase 6: Bound and stabilize the API

**Status:** `[ ]`

### Implementation contract

- Add global JSON/body limits before parsing requests.
- Bound page count, element count, points per stroke, text length, image source length, thumbnail length, tag count, and batch reorder size.
- Add pagination and stable cursors to page, folder, canvas, review, and activity listings.
- Replace raw `to_tsquery` construction with `websearch_to_tsquery` or `plainto_tsquery` as appropriate.
- Add a proper GIN full-text index.
- Convert malformed JSON, database errors, and provider errors into stable error envelopes.
- Add request IDs and structured logs with redaction.
- Add database, provider, and outbound-request timeouts.
- Separate liveness from database-aware readiness.
- Ensure server-side dashboard fetches show an outage state instead of converting every failure into an empty library.

### Completion gate

- Oversized and malformed requests fail predictably.
- Search punctuation and malformed terms cannot produce a server error.
- Pagination remains stable while records are added.
- Readiness fails when the database is unavailable; liveness remains responsive.

---

## Phase 7: Make persistence and autosave data-safe

**Status:** `[ ]`

### Current defects to address

- Any entity load error can trigger creation of a new blank entity.
- Saves use last-write-wins without a revision or conflict contract.
- Multiple in-flight saves can complete out of order.
- Save errors are not presented as recoverable user state.
- Note edits can regenerate both thumbnails, creating unnecessary work.

### Implementation contract

1. Create a new entity only when the URL contains no entity identifier.
2. Distinguish `401`, `403/404`, network failure, and server failure in the editor.
3. Add a monotonic revision or `updatedAt` precondition to page/canvas updates.
4. Serialize or coalesce saves so an older response cannot overwrite newer state.
5. Preserve an unsaved local recovery draft until the server confirms the revision.
6. Flush safely on explicit navigation and `pagehide`; do not rely only on a normal asynchronous fetch during `visibilitychange`.
7. Split content-only, metadata-only, and thumbnail-generating save paths.
8. Generate thumbnails only when visual canvas content changes.
9. Expose a quiet but actionable failure/conflict state.

### Required tests

- Transient load failure never creates a page.
- Invalid/foreign ID never creates a page.
- Rapid edits and delayed responses preserve the newest content.
- Two-tab conflict does not silently overwrite work.
- Navigation and reload preserve the latest acknowledged or recoverable draft.
- Note-only saves do not invoke thumbnail generation.

---

## Phase 8: Establish integration, browser, and CI gates

**Status:** `[ ]`

### Implementation contract

- Export an API app factory so routes can be tested without binding a port.
- Add isolated PostgreSQL integration tests for auth, ownership, migrations, search, and CRUD.
- Add Playwright journeys for:
  - magic-link and Google login callbacks using test doubles;
  - session expiry and logout;
  - folder/page creation and moves;
  - canvas create, draw, save, reload, and delete;
  - autosave failure and recovery;
  - search highlighting with malicious text;
  - Quick Capture;
  - desktop and mobile critical paths.
- Commit the CI workflow after review.
- Add migration-from-empty, dependency audit, secret scan, and Docker build jobs.
- Pin GitHub Actions to reviewed commit SHAs.
- Add branch protection requiring the production gate.

### Completion gate

- CI runs from a clean checkout and does not depend on developer `.env` files.
- All P0 security regressions have automated tests.
- A failed migration, audit, integration test, or browser journey blocks merge.

---

## Phase 9: Harden deployment and operations

**Status:** `[ ]`

### Container and network work

- Exclude archives, backups, local agent state, tests not required at runtime, and development artifacts from Docker context.
- Use Next.js standalone output or an equivalently minimal runtime image.
- Run web and API containers as non-root users.
- Pin base images to reviewed immutable digests during release preparation.
- Add API liveness/readiness and web health checks.
- Make service startup depend on readiness where supported.
- Terminate TLS at a documented reverse proxy and expose one public origin.
- Define CPU, memory, restart, and rollout limits in the deployment platform.

### Application operations work

- Add CSP, HSTS, `X-Content-Type-Options`, frame protection, Referrer Policy, and Permissions Policy.
- Disable `X-Powered-By`.
- Add error monitoring, structured logs, request correlation, latency/error metrics, and alert thresholds.
- Define backup frequency, retention, encryption, restore ownership, RPO, and RTO.
- Run and record a restore drill.
- Document deployment, migration, rollback, incident, and secret-rotation procedures.

### Completion gate

- Staging deploys from a clean commit and immutable image.
- Health checks, alerts, rollback, backup, and restoration are demonstrated.
- No local backup or secret enters build context or image layers.

---

## Phase 10: Reconcile product model and launch quality

**Status:** `[ ]`

### Page-model work

- Replace switchable `viewMode` with immutable `kind: "note" | "canvas"`.
- Migrate creation flows, dashboard cards, folder views, notebook sidebar, command palette, and empty states.
- Move canvas notes to canonical shape metadata with clipboard, duplicate, undo/redo, delete, search, and persistence coverage.
- Do not add inline diagrams until the fixed page-kind and shape-note vertical slice passes.
- Decide whether the legacy standalone `canvases` table remains a supported scratch surface or is migrated into pages. Do not maintain duplicate content models indefinitely.

### Product-truth work

- Either implement PNG/SVG/JSON export or remove those public claims.
- Either implement a real offline queue/conflict model or remove the offline-first claim.
- Resolve the contradiction between “No account required” and protected `/canvas` and `/capture` routes.
- Update the web manifest to match the actual product and authentication behavior.
- Add privacy and terms surfaces before sending user content to third-party AI providers in a public launch.

### Accessibility work

- Give the canvas a keyboard-focusable interaction model and accessible text representation.
- Add accessible names to every icon-only control.
- Add focus trapping, Escape behavior, labelled fields, and focus return for dialogs and drawers.
- Verify visible focus, contrast, non-color status cues, reduced motion, zoom/reflow, and touch target size.
- Run automated accessibility checks plus manual keyboard and screen-reader journeys.

### Completion gate

- Public claims match shipped behavior.
- The agreed page model is implemented end to end.
- Critical flows meet the project's WCAG 2.2 AA target.
- Staging passes desktop, mobile, keyboard, screen-reader, failure-recovery, security, and restore checks.

---

## Final production release checklist

All items must be true before public deployment:

- [ ] All P0 phases are complete.
- [ ] No known high-severity runtime vulnerability remains.
- [ ] Tenant-isolation tests pass with two users.
- [ ] Stored-XSS regression tests pass.
- [ ] Auth works through the production origin and secure cookie configuration.
- [ ] A clean database and an existing database both migrate successfully.
- [ ] CI passes from a clean checkout.
- [ ] Staging browser journeys pass on desktop and mobile.
- [ ] Autosave conflict and recovery journeys pass.
- [ ] Security headers and TLS are verified from the public staging URL.
- [ ] Logs contain no secrets, tokens, private URLs, or user content.
- [ ] Backup restoration has been demonstrated.
- [ ] Monitoring and alerts have been exercised.
- [ ] Product claims match implemented behavior.
- [ ] Accessibility release checks pass.
- [ ] Deployment and rollback owners are named.
- [ ] The release commit, migration set, and container images are immutable and recorded.

## Phase handoff template

At the end of every phase, append or update its completion evidence with:

```text
Status: completed | blocked
Files changed:
Tests run:
Results:
Manual verification:
Known limitations:
Staged: yes/no
Committed: yes/no
Pushed: yes/no
Next unchecked phase:
```
