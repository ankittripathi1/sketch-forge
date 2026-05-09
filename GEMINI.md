# Sketch Forge

A high-performance, wobbly-line sketching application built with Next.js and Rough.js. Inspired by Excalidraw, designed for engineering students and developers.

## Architecture & Design

### Monorepo Structure
- `apps/sketch-forge`: Main Next.js application (Frontend).
- `packages/canvas-core`: Core drawing engine, types, and history management.
- `packages/ui`: Shared React component library.
- `packages/typescript-config`: Centralized TS configurations.
- `packages/eslint-config`: Shared linting rules.

### Core Technologies
- **Frontend**: Next.js (App Router), React 19, Tailwind CSS 4.
- **Drawing**: Rough.js for hand-drawn aesthetics on HTML5 Canvas.
- **State Management**: React `useRef` for high-frequency drawing data (performance), `useState` for UI state (toolbar/settings).
- **Execution**: Bun (Package Manager & Runtime).

### Performance Optimization (ADRs)
- **ADR-001**: Dual-canvas architecture (Scene vs. Interaction layers).
- **ADR-002**: Refs for drawing data to bypass React's render cycle for 60fps interaction.
- **ADR-003**: `requestAnimationFrame` for throttling high-frequency pointer events.
- **ADR-005**: Unified Pointer Events for mouse, touch, and stylus support.

## Building and Running

### Development
```bash
bun install
bun dev
```
Starts all apps in development mode. The main app runs on [http://localhost:3000](http://localhost:3000).

### Build
```bash
bun build
```
Builds all packages and applications for production.

### Quality Checks
```bash
bun lint        # Run ESLint across the monorepo
bun check-types # Run TypeScript type checking
```

## Development Conventions

### Coding Style
- **Naming**: Use PascalCase for components (`SketchCanvas.tsx`), camelCase for hooks (`useSketchEngine.ts`).
- **Styles**: Prefer Tailwind CSS 4 utility classes.
- **Types**: Always export types from `@repo/canvas-core/types`.

### Drawing Engine
When modifying the canvas engine:
1.  **Immutability**: Treat the `elements` array in `useSketchEngine` as the source of truth for the scene.
2.  **Seed Stability**: Always use the `seed` property from `SketchElement` when rendering with Rough.js to ensure visual consistency on redraws.
3.  **Coordinate Space**: Distinguish between screen coordinates (pixels) and canvas coordinates (transformed by zoom/pan) using `screenToCanvas` and `canvasToScreen`.

### Adding New Tools
1.  Define the tool name in `@repo/canvas-core/types`.
2.  Update `renderElement.ts` with the Rough.js implementation.
3.  Handle pointer events in `useSketchEngine.ts`.
4.  Add the icon/button to the `Toolbar` component.

## Project History & Decisions
Refer to `DECISIONS.md` in the root directory for detailed Architecture Decision Records (ADRs).
