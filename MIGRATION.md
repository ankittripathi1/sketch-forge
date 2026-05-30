# Restructuring to an Excalidraw-style package layout

This document is a step-by-step guide for reshaping `sketch-forge`'s packages to
follow the same layering philosophy as Excalidraw — **without losing any current
feature**. It explains the _why_ behind each move so you can make judgement calls
as you go, then gives an exact, sequenced checklist.

> Status: planning doc. No code has been moved yet. Each step below is designed to
> be its own self-contained, green PR.

---

## 1. What we're copying from Excalidraw (and what we're not)

Excalidraw's `packages/` directory is a **strict layered dependency DAG**, ordered
from pure to impure. Every package may only import from packages _below_ it:

```
@excalidraw/math        pure geometry — points, vectors, curves, angles. ZERO deps.
        ↑
@excalidraw/common      constants, colors, keys, font config, low-level utils
        ↑
@excalidraw/element     the element DOMAIN — create, mutate, bounds, hit-test,
                        resize, drag, arrow binding, text measure, collision
        ↑
@excalidraw/utils       higher-level helpers — export to canvas/svg/blob
        ↑
@excalidraw/excalidraw  React component, UI, state, interaction (the app layer)
```

The benefit is **not** "more packages." It's that:

1. Each layer is **testable without the layer above it**. You can test resize math
   without spinning up React or a canvas.
2. There is **exactly one home** for each concern — no "where does this go?".
3. **Dependencies only point downward.** This is the rule we most violate today
   (see §3).

### How Excalidraw handles types — the important nuance

Excalidraw does **not** use Zod for its element model. The canonical types are
plain hand-written TypeScript in `@excalidraw/element/types.ts`. Persisted/imported
data is validated and normalized at the edge through a `restore()` routine plus
versioned migrations — never by re-deriving the in-memory type from a schema.

**What this means for us:** today `SketchElement` is defined _twice_ — as a TS type
in `packages/canvas-core/src/types.ts` and as a Zod schema in
`packages/schema/src/canvas.ts`. The Excalidraw-faithful resolution is:

- **`@repo/element` owns the canonical TS types** (`SketchElement`, `Tool`,
  `Point`, `FillStyle`, …). Hand-written, no Zod.
- **`@repo/schema` (Zod) becomes a pure edge validator** — it validates data
  crossing the API/storage boundary (request bodies, DB rows) and nothing inside
  the canvas engine imports it for its in-memory type. A single compile-time check
  keeps the two aligned (see Step 0).

---

## 2. Where we are today

Two packages, each mixing several layers:

| Package | Contents | Problem |
|---|---|---|
| `canvas-core` (~2566 ln) | `types`, `renderElement` (1174 ln), `hitDetection`, `history`, `colorUtils`, `textEditor`, `renderToImage`, `codeHighlight`, `lib/layoutAI`, `lib/recognition` | Pure types + domain logic + heavy canvas-2D rendering + OCR all in one layer. No pure layer. |
| `canvas-engine` (~3398 ln) | `useSketchEngine` (724 ln), `store` (zustand), `geometry` (275 ln), `transform`, `viewport`, `selectionModel`, `historyModel`, tool controllers, `theme`, `beautify`, `scribble` | Pure geometry/transform mixed with React, zustand, and interaction controllers. |

Consumers (the Next.js app) import via subpath barrels you already expose:

```ts
import { useSketchEngine, useCanvasUI } from "@repo/canvas-engine";
import type { SketchElement, Tool, FillStyle } from "@repo/canvas-core/types";
import { isColorDark } from "@repo/canvas-core/colorUtils";
import { renderCanvasToBlob } from "@repo/canvas-core/renderToImage";
```

Because every package uses `"exports": { ".": "...", "./*": "./src/*.ts" }`, the
only mechanical work when moving a file is **fixing its import path**.

---

## 3. The core problem to fix: a backwards dependency

This is the single most important thing to understand. Today:

```ts
// packages/canvas-engine/src/lib/geometry.ts   ← DOMAIN logic (resize, binding)
import {
  getAnchorPoint,
  getAllAnchorPoints,
  resolveArrowEndpoints,
} from "@repo/canvas-core/renderElement";   // ← imported FROM the renderer
```

Arrow-anchor geometry (`getAnchorPoint`, `getAllAnchorPoints`,
`resolveArrowEndpoints`) is **pure math** that the domain needs, but it currently
lives inside the 1174-line renderer file `renderElement.ts`. So our **domain layer
depends on our renderer** — the exact opposite of Excalidraw.

Two more tangles found while mapping:

- **`transform.ts` is two concerns glued together:**
  - `screenToCanvas` / `canvasToScreen` → pure math (`@repo/math`)
  - `applyTransform` / `clearCanvas` / `getDeviceScale` → canvas/DOM ops (`@repo/renderer`)
- **`textEditor.ts` mixes** `measureTextBox` (measurement → element) with
  `openTextEditor` (DOM `<textarea>` → stays in the React/engine layer).

Untangling these is most of the work; once done, the DAG falls into place.

---

## 4. Target structure

```
@repo/math      pure: screenToCanvas, canvasToScreen, point/vector helpers,
                bend-curve math.  ZERO deps. (starts small, grows over time)
   ↑
@repo/common    colorUtils, theme, default-style constants
   ↑
@repo/element   CANONICAL types (hand-written TS), hitDetection, selectionModel,
                history, geometry (normalize/resize/syncBoundArrows),
                anchor + binding geometry (MOVED OUT of renderElement),
                measureTextBox
   ↑
@repo/renderer  (= today's canvas-core, slimmed) renderElement, rendering,
                renderToImage, codeHighlight, applyTransform/clearCanvas,
                recognition, layoutAI
   ↑
@repo/canvas-engine  (keep) store, useSketchEngine, tool controllers,
                openTextEditor (DOM), beautify, scribble
                ← this is our equivalent of @excalidraw/excalidraw

@repo/schema    (keep) Zod — EDGE validator only (API/DB boundary).
                Depends on @repo/element types for its compile-time alignment check.
```

Dependency DAG — all arrows point down, no cycles:

```
math   → ø
common → math
element → math, common
renderer → element, math, common        (+ roughjs, prismjs, tesseract)
canvas-engine → renderer, element, math, common   (+ react, zustand)
schema → element (types only, for the alignment check)
```

### Per-package `package.json` skeleton

Every new package mirrors what the current ones do:

```jsonc
{
  "name": "@repo/math",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*.ts"
  },
  "scripts": { "check-types": "tsc --noEmit" },
  "devDependencies": {
    "@repo/typescript-config": "*",
    "typescript": "^6.0.3"
  }
}
```

Plus a `tsconfig.json` extending `@repo/typescript-config` (copy from `canvas-core`).

---

## 5. The migration, step by step

**Golden rule:** after _every_ step, run the one verification command and don't move
on until it's clean:

```bash
bun run check-types     # turbo runs `tsc --noEmit` across all packages
```

Optionally also `bun run build` and a manual smoke test of the canvas app before
merging each PR. Move one logical group per PR so review stays small.

---

### Step 0 — Make `@repo/schema` an edge validator, not a second type source

**Goal:** stop maintaining `SketchElement` in two places, the Excalidraw way (TS is
canonical, Zod only validates at the edge).

For now the canonical TS types still live in `canvas-core/src/types.ts` (they move
to `@repo/element` in Step 4). The change in this step is to make `@repo/schema`
**check itself against** those TS types instead of being an independent definition.

1. In `packages/schema/src/canvas.ts`, keep the Zod schemas (they validate API/DB
   payloads) but add a compile-time assertion that the inferred type matches the
   canonical TS type:

   ```ts
   import type { SketchElement as CoreSketchElement } from "@repo/canvas-core/types";

   // Compile error if the Zod schema and the canonical TS type ever drift.
   type _AssertSchemaMatchesCore =
     z.infer<typeof SketchElementSchema> extends CoreSketchElement
       ? CoreSketchElement extends z.infer<typeof SketchElementSchema>
         ? true
         : never
       : never;
   const _check: _AssertSchemaMatchesCore = true;
   ```

2. Add `"@repo/canvas-core": "*"` to `schema`'s `devDependencies` (type-only, fine).
3. Audit the app: anything importing element types **from `@repo/schema`** for
   in-memory canvas use should import from `@repo/canvas-core/types` instead. Leave
   `@repo/schema` imports only on the API/DB request-validation paths.

**Verify:** `bun run check-types`. If the assertion line errors, the two definitions
already disagree — reconcile them now (good — that's the bug this prevents forever).

---

### Step 1 — Create `@repo/math` (lowest risk; proves the workflow)

**Goal:** stand up the bottom of the DAG with genuinely pure functions.

1. Scaffold `packages/math/` (`package.json` + `tsconfig.json` from the skeleton
   above + `src/index.ts`).
2. Move the **pure** half of `canvas-engine/src/lib/transform.ts`:
   - `screenToCanvas`, `canvasToScreen` → `packages/math/src/coords.ts`
   - Leave `applyTransform`, `clearCanvas`, `getDeviceScale` where they are for now
     (they go to `@repo/renderer` in Step 5).
3. `Point` is imported by these functions. Until Step 4, import it from
   `@repo/canvas-core`. After Step 4 it comes from `@repo/element`. (Or: define a
   local structural `type Point = { x: number; y: number }` in `@repo/math` so math
   stays truly dependency-free, and have `@repo/element` re-export _that_ as the
   canonical `Point`. This is the cleanest and most Excalidraw-like option.)
4. Export from `packages/math/src/index.ts`.
5. Update the importer `canvas-engine/src/lib/transform.ts` (and `useSketchEngine`,
   `viewport`, `rendering`, `drawingController`) to pull `screenToCanvas` /
   `canvasToScreen` from `@repo/math`.
6. Add `"@repo/math": "*"` to `canvas-engine`'s dependencies.

**Verify:** `bun run check-types`.

---

### Step 2 — Create `@repo/common`

**Goal:** shared low-level constants/colors/theme with no domain knowledge.

1. Scaffold `packages/common/`.
2. Move `canvas-core/src/colorUtils.ts` → `packages/common/src/colors.ts`
   (`isColorDark`, `DEFAULT_LIGHT_STROKE`, `DEFAULT_DARK_STROKE`).
3. Move `canvas-engine/src/lib/theme.ts` → `packages/common/src/theme.ts`.
4. Pull default style constants out of `canvas-engine/src/lib/toolStyle.ts` into
   `packages/common/src/constants.ts` (leave the stateful `toolStyleController` in
   the engine).
5. Export from `index.ts`. Update importers:
   - `renderElement.ts` imports `isColorDark` → `@repo/common`
   - app's `useCanvasPreferences.ts` / `canvas/page.tsx` import `isColorDark` →
     `@repo/common`
6. Add `"@repo/common": "*"` where needed; `common` depends on `@repo/math` only if
   it needs it.

**Verify:** `bun run check-types`.

---

### Step 3 — Invert the anchor dependency (the important one)

**Goal:** move pure anchor/binding geometry _out of the renderer_ so the domain no
longer imports upward. After this, `renderElement` imports anchors, not owns them.

1. Create `packages/element/` scaffold now (it gets filled in Step 4 too).
2. Move `getAnchorPoint`, `getAllAnchorPoints`, `resolveArrowEndpoints` from
   `canvas-core/src/renderElement.ts` → `packages/element/src/binding.ts`.
   - These compute anchor points from element bounds + `AnchorSide` — pure math,
     no canvas context. They belong in the domain.
3. Update `renderElement.ts` to **import** them from `@repo/element`.
4. Update `canvas-engine/src/lib/geometry.ts` to import them from `@repo/element`
   instead of `@repo/canvas-core/renderElement`.
5. `canvas-core` (renderer) now depends on `@repo/element` — correct direction.

**Verify:** `bun run check-types`. Confirm no import cycle:
`renderer → element` only, never `element → renderer`.

---

### Step 4 — Fill out `@repo/element` (the big one — safe now)

**Goal:** consolidate the element domain. This is large but low-risk because Steps
1–3 already removed its bad upward dependencies.

Move into `packages/element/src/`:

1. **Canonical types** — move `canvas-core/src/types.ts` here as
   `element/src/types.ts` (`SketchElement`, `Tool`, `Point`, `FillStyle`,
   `TextAlign`, `ArrowBinding`, `AnchorSide`, …). This is now the one source of
   truth. Have `@repo/math` re-import or keep `Point` per the Step 1 decision.
2. `canvas-core/src/hitDetection.ts` → `element/src/bounds.ts` (`getBoundingBox`,
   `getElementsBoundingBox`, `hitTestElement`, `hitTestHandle`,
   `isElementInsideRect`).
3. `canvas-engine/src/lib/selectionModel.ts` → `element/src/selection.ts`.
4. `canvas-core/src/history.ts` → `element/src/history.ts` (operates on
   `SketchElement[]`).
5. `canvas-engine/src/lib/geometry.ts` → `element/src/transform.ts`
   (`normalizeElement`, `applyResize`, `applyResizeWithTextMeasurement`,
   `syncBoundArrows`, `findBindableShape`).
6. **Split `canvas-core/src/textEditor.ts`:**
   - `measureTextBox` → `element/src/text.ts`
   - `openTextEditor` (DOM `<textarea>`) stays — move it into `canvas-engine`
     (e.g. `canvas-engine/src/textEditor.ts`).
7. Update Step 0's assertion import in `@repo/schema` to point at
   `@repo/element` instead of `@repo/canvas-core/types`.
8. Sweep all importers (app + engine + renderer) to the new `@repo/element/*`
   subpaths. The app currently imports `@repo/canvas-core/types`,
   `@repo/canvas-core/hitDetection` — these become `@repo/element/*`.

**Verify:** `bun run check-types`, then a manual canvas smoke test (draw, select,
resize, arrow-bind, edit text) — this step touches selection/resize/binding.

---

### Step 5 — Rename `canvas-core` → `@repo/renderer` and slim it

**Goal:** what remains of `canvas-core` is purely "draw onto a 2D context."

1. Rename the package `@repo/canvas-core` → `@repo/renderer` (update `name`, all
   `dependencies` keys, and every importer string).
2. Remaining files: `renderElement.ts`, `lib/rendering.ts` (move from engine),
   `renderToImage.ts`, `codeHighlight.ts`, plus the canvas-op half of `transform.ts`
   (`applyTransform`, `clearCanvas`, `getDeviceScale`) moved here.
3. Decide on `lib/recognition.ts` (OCR/tesseract) and `lib/layoutAI.ts`: either keep
   them in `@repo/renderer` or split a small `@repo/utils` for "higher-level helpers"
   (Excalidraw-style). Recommended: leave them in renderer for now; split later only
   if they grow.
4. `canvas-engine` keeps: `store`, `useSketchEngine`, all tool **controllers**,
   `historyModel`, `viewportController`, `scribbleController`, `beautify`,
   `openTextEditor`. It depends on `renderer + element + math + common`.

**Verify:** `bun run check-types` + full app smoke test (every tool, export to
image, OCR, layout AI). After this the DAG matches §4 exactly.

---

## 6. Final checklist (one line per step)

- [ ] **Step 0** — `@repo/schema` becomes edge validator; add drift-assertion.
- [ ] **Step 1** — `@repo/math` created; `screenToCanvas`/`canvasToScreen` moved.
- [ ] **Step 2** — `@repo/common` created; colors + theme + constants moved.
- [ ] **Step 3** — anchor/binding geometry moved out of `renderElement` → `@repo/element`.
- [ ] **Step 4** — `@repo/element` filled: types, bounds, selection, history, transform, text measure.
- [ ] **Step 5** — `canvas-core` → `@repo/renderer`, slimmed to drawing only.

No feature is removed at any point — every step only **relocates** code and rewires
imports, verified by `bun run check-types` plus a smoke test. The app's public
imports change from `@repo/canvas-core/*` to `@repo/element/*` / `@repo/renderer/*`,
which is the only externally visible difference.
