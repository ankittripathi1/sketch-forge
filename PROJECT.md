# Sketch Forge — Project Context for AI Agents

> Read this first. It describes what Sketch Forge is, what's shipped vs. in
> progress, the codebase layout, and where to find things. For build/test/style
> conventions, see `AGENTS.md`. For long-term roadmap detail, see `ROADMAP.md`.

---

## 1. One-line summary

Sketch Forge is an infinite-canvas notebook for sketching diagrams and writing
notes in one place — hand-drawn aesthetic (rough.js), editorial typography
(Spectral + Kalam), works on phone / tablet / desktop, optional account sync,
collaboration coming.

## 2. Positioning

Not an Excalidraw clone. Differentiators:

- Notebook-style organization (pages, folders, templates) — not just a flat
  list of canvases.
- Editorial paper-craft UI — Spectral serif display, Kalam handwritten
  marginalia, warm cream paper theme by default.
- Touch-first + Apple Pencil parity with desktop.
- Roadmap leans toward AI-assisted drawing (text→diagram, sketch cleanup)
  once the collaboration foundation lands.

## 3. Repo layout

Turborepo monorepo, Bun workspaces.

| Path | What it is |
| --- | --- |
| `apps/sketch-forge/` | Next.js 16 (App Router, React 19) web client. |
| `apps/api/` | Hono + Bun HTTP API. |
| `packages/canvas-core/` | Rendering primitives, element types, `renderElement`, `renderToImage`. |
| `packages/canvas-engine/` | `useSketchEngine` hook — drawing state, undo/redo, pointer, zoom/pan, hit detection. |
| `packages/db/` | Drizzle ORM schema + seeds for PostgreSQL. |
| `packages/schema/` | Zod schemas: `canvas`, `page`, `folder`, `notebook`, `template`, `extractText`. |
| `packages/ui/` | Shared React components. |
| `packages/eslint-config/`, `packages/typescript-config/` | Tooling presets. |

### Web app routes (`apps/sketch-forge/app/`)

| Route | Status | Notes |
| --- | --- | --- |
| `/` | shipped | Landing page (editorial paper-craft design). |
| `/canvas` | shipped | The drawing surface. |
| `/dashboard` | beta | List of canvases, folders, activity. |
| `/login` | beta | JWT auth. |
| `/capture` | beta | Quick paste-and-sketch entry point. |

### API routes (`apps/api/src/routes/`)

`auth.ts`, `canvases.ts`, `pages.ts`, `folders.ts`, `templates.ts`, `stats.ts`.
JWT middleware at `apps/api/src/middleware/auth.ts`. Email helpers at
`apps/api/src/lib/email.ts`. JWT helpers at `apps/api/src/lib/jwt.ts`.

---

## 4. Feature inventory

### STATUS: shipped

**Drawing engine**

- Pointer events (mouse + touch + Apple Pencil + stylus).
- Tools: freehand, rectangle, ellipse, line / arrow, text (click-to-place,
  inline edit), eraser, select.
- Undo / redo with history stack (`Ctrl+Z` / `Ctrl+Shift+Z`).
- Zoom (wheel + `+`/`-` keys), pan (space-drag or middle mouse).
- Zoom-level indicator, keyboard-shortcut tooltips.

**Selection + manipulation**

- Per-shape hit detection.
- 8-handle bounding box, drag to move, drag handles to resize.
- Marquee multi-select, `Shift`-click to add.
- Delete (`Backspace` / `Delete`), `Shift` to lock aspect ratio.

**Style + canvas chrome**

- Stroke color picker, fill color picker.
- Stroke width (thin / medium / bold), stroke style (solid / dashed / dotted).
- Background picker (paper, dot grid, plain).
- Style panel, toolbar with lucide icons, canvas actions, template menu,
  notebook sidebar.

**Theming + identity**

- Light cream paper theme (default) + warm dark theme, toggleable via
  `ThemeSelector`.
- Typography: Spectral (display + body), Geist (UI), Kalam (marginalia).

**Landing page**

- Editorial paper-craft design, animated drawing loop in hero, scroll-revealed
  feature cards with hover micro-interactions, collab teaser with floating
  cursor avatars.

### STATUS: beta

- **Auth** — JWT-based sign-up / login. Email flow scaffolded.
- **Dashboard** — canvas list, folders, recent activity. UI still being
  polished.
- **Pages + folders** — hierarchical organization. API live; UI in progress.
- **Templates** — flowchart / wireframe / mind-map starters via
  `/api/templates`.
- **Capture flow** — `/capture` route for quick paste-and-sketch.
- **PWA** — `manifest.json` shipped; installable on mobile.

### STATUS: planned — single-user features

- Copy / paste (`Ctrl+C` / `Ctrl+V`), duplicate (`Ctrl+D`).
- Z-order controls (bring forward / send backward).
- Smart connectors — arrows that stick to shape edges, follow on move.
- Shape recognition — hold to snap rough drawings to clean primitives.
- Frames — named regions, zoom-to-focus, double as slides in presentation
  mode.
- Component library — save and reuse custom shape groups.
- Mini-map, grid + snap, ruler guides.
- Export — PNG, SVG, PDF.

### STATUS: planned — real-time collaboration (Phase 4, in design)

Currently the canvas is single-user with optional account sync. Collab plan:

- **Transport** — new `apps/server` running Hono + Bun WebSockets alongside
  the existing REST API.
- **Sync** — Yjs CRDT for conflict-free concurrent edits and offline
  reconciliation.
- **Live cursors** — name-labeled cursors per user, spring-interpolated motion
  (not raw position updates).
- **Presence avatars** — top-bar pills showing who's currently viewing.
- **Sharing** — shareable links with view-only and edit modes.
- **Permissions** — owner / editor / viewer roles per canvas.
- **Version history** — snapshot timeline, restore any prior state.

The marketing surface for collab is already live: the landing page teases this
("On the next page — real-time collaboration…") with two animated cursor
avatars (`Maya`, `Jun`) drifting on a grid background, so the public-facing
story is ready before the backend ships.

### STATUS: planned — AI features (Phase 5)

- Text → diagram (e.g., type "user login flow" → generated flowchart).
- Sketch cleanup (rough freehand → polished shapes).
- Auto-label suggestions.
- Smart resize (frame contents reflow).
- Copilot side panel.

### STATUS: planned — ecosystem (Phase 6)

- Embed (iframe).
- Community template marketplace.
- Plugin API for custom tools / shapes.
- Desktop app (Tauri).
- Mobile app (React Native sharing `canvas-core`).

---

## 5. Tech stack

- **Runtime / package manager:** Bun.
- **Monorepo:** Turborepo.
- **Web client:** Next.js 16, React 19, Tailwind 4, `motion` (Framer Motion),
  `next-themes`, `lucide-react`, `roughjs`.
- **API:** Hono on Bun.
- **DB:** PostgreSQL via Drizzle ORM.
- **Schemas:** Zod (in `@repo/schema`).
- **Auth:** JWT (custom, in `apps/api/src/lib/jwt.ts`).
- **Real-time (planned):** Yjs CRDT + Bun WebSockets.
- **Typography:** Spectral, Geist, Kalam.

## 6. Design context

For design-engineering work, see `.impeccable.md` at the repo root. Short
version: editorial / paper-craft aesthetic, light cream paper default theme,
restrained gold accent, Spectral as primary type, Kalam reserved for
marginalia and captions only.

## 7. Conventions to follow

- Keep shared drawing logic in `@repo/canvas-core` / `@repo/canvas-engine` —
  don't duplicate inside the app.
- Component files: `PascalCase.tsx`. Hooks: `useSomething.ts`. Utilities:
  `camelCase.ts`.
- Server-render by default; mark components `"use client"` only when needed
  (interactive state, `motion`, hooks).
- Use design tokens from `globals.css` (`--color-surface-*`, `--color-text-*`,
  `--color-accent`, etc.) — don't hardcode colors.
- Don't touch `/canvas` interactive components casually — they're tightly
  coupled to the drawing engine.
- Before commits: `bun lint`, `bun check-types`, `bun build` should pass.

## 8. Quick links

- Build / test / commit conventions → `AGENTS.md`
- Long-form roadmap with phase breakdown → `ROADMAP.md`
- Design context (aesthetic direction, type, theme) → `.impeccable.md`
- Decision log → `DECISIONS.md`
