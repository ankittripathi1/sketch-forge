# Architecture Decision Records

> Every significant technical decision in Sketch Forge is recorded here.
> Format: what changed, why we changed it, what problem it solved, what tradeoffs we accepted.

---

## ADR-001 — Two canvas layers instead of one

**Date:** 2026-05-09
**Status:** Active

### Problem
Every `mousemove` event was triggering a React state update → React re-render → `useEffect` → `clearRect` → full redraw of all elements. This caused visible flickering because all finalized shapes were being erased and redrawn on every pixel of mouse movement.

### Decision
Use two stacked `<canvas>` elements:
- **Scene canvas** (bottom) — only holds finalized elements. Redrawn once on `finalizeElement()`.
- **Interaction canvas** (top) — only holds the element currently being drawn. Cleared and redrawn on every `mousemove`.

### Why this works
Finalized elements are never touched during drawing. Only the top canvas (one shape) redraws on mousemove — which is cheap. The heavy redraw (all elements) only happens once per completed stroke.

### What Excalidraw does
Same approach. They call it `staticCanvas` and `interactiveCanvas`. See:
- `packages/excalidraw/renderer/staticScene.ts`
- `packages/excalidraw/renderer/interactiveScene.ts`

### Tradeoffs
- Two canvas refs to manage instead of one
- Must be careful to clear interaction canvas after finalizing

---

## ADR-002 — Refs instead of React state for drawing data

**Date:** 2026-05-09
**Status:** Active

### Problem
Storing `elements` and `currentElement` in React `useState` meant every `mousemove` triggered a React re-render. Even with two canvases, React was still doing reconciliation work on every pixel.

### Decision
Store all drawing data in `useRef`:
- `elements` → `useRef<SketchElement[]>([])`
- `currentElement` → `useRef<SketchElement | null>(null)`
- `isDrawing` → `useRef(false)`

Only `tool` and `historyStatus` live in `useState` because those need to trigger UI updates (toolbar re-renders).

### Why this works
Ref updates are synchronous and do not trigger re-renders. The canvas is drawn imperatively — we call `renderScene()` directly, not through React's render cycle.

### Tradeoffs
- Can't use React DevTools to inspect drawing state
- Must manually call render functions instead of relying on `useEffect`
- Future: if we need React to know about element state (e.g. for a properties panel), we'll need to expose a read-only state snapshot

---

## ADR-003 — requestAnimationFrame for mousemove drawing

**Date:** 2026-05-09
**Status:** Active

### Problem
`mousemove` fires more often than the browser repaints (up to 1000Hz on some devices). Drawing on every event wastes CPU since most frames are never displayed.

### Decision
Wrap `renderActiveElement()` in `requestAnimationFrame` during `onPointerMove`. Cancel the previous frame request before scheduling a new one so rapid events collapse into one paint per frame.

```ts
cancelAnimationFrame(rafId.current);
rafId.current = requestAnimationFrame(renderActiveElement);
```

### Why this works
`requestAnimationFrame` fires at display refresh rate (60-120fps). Even if mouse fires 500 times between frames, we only draw once.

### Tradeoffs
- Adds ~1 frame of latency to freehand drawing (imperceptible in practice)
- `rafId` ref must be cleaned up — currently not cancelled on unmount (future fix)

---

## ADR-004 — Monorepo package extraction (`@repo/canvas-core`)

**Date:** 2026-05-09
**Status:** Active

### Problem
Drawing types (`SketchElement`, `Tool`, `Point`) and the render function lived inside `apps/sketch-forge`. If we build a mobile app or another canvas surface later, we'd have to duplicate this code.

### Decision
Extract into `packages/canvas-core`:
```
packages/canvas-core/src/
  types.ts          ← SketchElement, Tool, Point
  renderElement.ts  ← roughjs rendering per element
  history.ts        ← undo/redo stack
```

Apps import via `@repo/canvas-core/types`, `@repo/canvas-core/renderElement`, etc.

### Why this works
Bun workspaces resolve `@repo/canvas-core` to the local package. No publishing needed. Turborepo handles build order.

### Future additions to canvas-core
- `hitDetection.ts` — for select tool (Phase 2)
- `shapeRecognition.ts` — for iPad hold-to-snap (Phase 3)
- `transform.ts` — resize/move math

### Tradeoffs
- More package.json files to maintain
- TypeScript config must be shared correctly (`@repo/typescript-config`)

---

## ADR-005 — Pointer events instead of mouse events

**Date:** 2026-05-09
**Status:** Active

### Problem
`onMouseDown/Move/Up` only fires for mouse input. iPad, touchscreen, and Apple Pencil users would get no response.

### Decision
Replace all mouse event handlers with pointer events:
- `onMouseDown` → `onPointerDown`
- `onMouseMove` → `onPointerMove`
- `onMouseUp` → `onPointerUp`
- Added `onPointerLeave` → same as `onPointerUp` (stops drawing when cursor leaves canvas)
- Added `style={{ touchAction: "none" }}` to prevent browser scroll/zoom interference

### Why this works
The Pointer Events API is a unified abstraction over mouse, touch, and stylus. Same `clientX/clientY` API — zero extra code needed for touch support.

### Tradeoffs
- `pointercancel` event not handled yet — could cause stuck drawing state on mobile if system interrupts (e.g. notification)
- Future: handle `pointercancel` same as `pointerup`

---

## ADR-006 — Undo/redo via history stack with pointer index

**Date:** 2026-05-09
**Status:** Active

### Problem
Users expect `Ctrl+Z` / `Ctrl+Shift+Z`. Without it the app is unusable for real work.

### Decision
`packages/canvas-core/src/history.ts` implements a pure JS history manager:
- `snapshots: SketchElement[][]` — array of full element array snapshots
- `pointer: number` — current position in the stack
- `push()` — slices off future states (so drawing after undo clears redo), appends new snapshot
- `undo()` — moves pointer back, returns that snapshot
- `redo()` — moves pointer forward, returns that snapshot

`useSketchEngine` holds a `useRef(createHistory())` — history survives re-renders but doesn't cause them.

A separate `historyStatus` useState tracks `{ canUndo, canRedo }` for toolbar button disabled states.

### Why snapshot approach (not diff/patch)
- Simple to implement and reason about
- Elements arrays are small (canvas drawings rarely exceed thousands of elements)
- Diff/patch would be needed only at massive scale or for collaborative editing (Yjs handles that in Phase 4 anyway)

### Keyboard shortcuts
```
Ctrl+Z / Cmd+Z         → undo
Ctrl+Shift+Z / Cmd+Shift+Z → redo
```
Registered in `page.tsx` via `window.addEventListener("keydown", ...)` inside `useEffect`.

### Tradeoffs
- Full snapshots use more memory than diffs (acceptable for current scale)
- Freehand strokes with hundreds of points make snapshots larger — consider point decimation in future

---

## ADR-007 — Roughjs `seed` per element for shape consistency

**Date:** 2026-05-09
**Status:** Active

### Problem
Roughjs generates random wobbly paths using an internal random number generator. Every call to `rc.rectangle()`, `rc.ellipse()` etc. produces a slightly different result. So every `renderScene()` call caused shapes to visually shift — most visible on undo/redo which triggers a full scene redraw.

Example: a circle drawn with a slight bump on the right side would after undo/redo show that bump on the top.

### Decision
Add `seed: number` to `SketchElement`. Generate it once randomly in `onPointerDown`:

```ts
seed: Math.floor(Math.random() * 100000)
```

Pass it to every roughjs call as an option:

```ts
rc.rectangle(x, y, w, h, { seed: el.seed })
```

Roughjs uses the seed to initialize its RNG, so the same seed always produces the same wobbly pattern.

### What Excalidraw does
Identical approach. Every Excalidraw element has a `seed` field.

### Tradeoffs
- Seed is part of the element's identity — must be preserved through undo/redo, copy/paste, and eventually DB persistence
- Seed of `0` has a specific roughjs behavior — avoid it (use `Math.max(1, seed)` if needed)

---

## ADR-008 — Background picker (plain / dot grid / box grid)

**Date:** 2026-05-09
**Status:** Active

### Problem
A plain white canvas gives no spatial reference. Drawing with no grid is disorienting for technical users (engineering students, developers) who need to align elements.

### Decision
Three background modes implemented via CSS `background-image` on the canvas wrapper:

| Mode | CSS |
|---|---|
| Plain | Solid `oklch(0.97 0.003 260)` |
| Dot grid | `radial-gradient` 1.5px dots every 20px |
| Box grid | Crossed `linear-gradient` lines every 20px |

A `BackgroundPicker` component (bottom-left, matching toolbar dark theme) lets users switch modes. State lives in `page.tsx` as `useState` — no persistence yet (resets on refresh).

### Why CSS gradients not canvas
The grid is purely decorative UI, not part of the drawing. Drawing it on canvas would interfere with element rendering and exports. CSS background keeps it cleanly separated.

### Future
- Persist preference to `localStorage`
- Add dark mode variants of all three
- Snap-to-grid behavior when grid is active (Phase 3)

---

## Naming conventions

All code follows these names. When adding new files, match this pattern:

| Concept | Name |
|---|---|
| Canvas component | `SketchCanvas.tsx` |
| Drawing hook | `useSketchEngine.ts` |
| Element type | `SketchElement` |
| Render function | `renderElement()` |
| Scene canvas ref | `sceneCanvasRef` |
| Interaction canvas ref | `interactionCanvasRef` |
| Redraw finalized | `renderScene()` |
| Redraw active | `renderActiveElement()` |
| Finalize stroke | `finalizeElement()` |
| History factory | `createHistory()` |
