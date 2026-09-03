import type { Point, SketchElement } from "@repo/element/types";
import type { HistoryState } from "@repo/element/history";
import { createHistory } from "@repo/element/history";
import type {
  BindableShape,
  CanvasInteraction,
  SelectInteraction,
  SelectionMarquee,
} from "../tools/interactions";
import { createScene, type SketchScene } from "../scene";

/**
 * The editor's *frame state*: everything that changes while a pointer is down.
 *
 * The other half of the rule documented on `CanvasAppState`. These fields are
 * read and written up to once per animation frame, so they are plain mutable
 * values with no subscription. Writing one never re-renders React, which is the
 * point: a drag at 120Hz must not touch the React tree.
 *
 * If a field needs to drive JSX, it does not belong here. Add a throttled
 * display copy to `CanvasAppState` instead, the way `zoom` pairs with
 * `zoomDisplay`.
 */
export type CanvasFrameState = {
  elements: SketchElement[];
  scene: SketchScene;
  history: HistoryState;

  /** Live viewport. `zoomDisplay` and `panOffsetDisplay` mirror these for JSX. */
  zoom: number;
  panOffset: Point;

  /** The element currently being drawn, before it is committed to the scene. */
  currentElement: SketchElement | null;
  selectionMarquee: SelectionMarquee | null;
  selectInteraction: SelectInteraction;
  canvasInteraction: CanvasInteraction;
  hoveredAnchor: BindableShape | null;
  isPanning: boolean;
  pointerScreenPosition: Point | null;

  /** Handwriting strokes waiting to be recognised. */
  pendingScribbleIds: string[];
  scribbleTimer: ReturnType<typeof setTimeout> | null;

  /** In-flight animation frames, so a new render can cancel a stale one. */
  interactionRafId: number;
  viewportRafId: number;
};

export function createFrameState(): CanvasFrameState {
  return {
    elements: [],
    scene: createScene(),
    history: createHistory(),
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    currentElement: null,
    selectionMarquee: null,
    selectInteraction: { type: "idle" },
    canvasInteraction: { type: "idle" },
    hoveredAnchor: null,
    isPanning: false,
    pointerScreenPosition: null,
    pendingScribbleIds: [],
    scribbleTimer: null,
    interactionRafId: 0,
    viewportRafId: 0,
  };
}
