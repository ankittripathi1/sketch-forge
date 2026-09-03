import type { AnchorSide, Point, SketchElement } from "@repo/element/types";

/**
 * The in-progress interaction unions, kept in their own module so the editor's
 * frame state can name them without depending on the controllers that drive
 * them. The dependency runs one way: controllers import the editor, not the
 * other way round.
 */

export type SelectInteraction =
  | { type: "idle" }
  | { type: "dragging"; lastPoint: Point; moved: boolean }
  | {
      type: "resizing";
      handle: number;
      origin: SketchElement;
      moved: boolean;
    }
  | { type: "marquee"; additive: boolean };

export type SelectionMarquee = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type CanvasInteraction =
  | { type: "idle" }
  | { type: "drawing" }
  | { type: "panning"; lastScreenPoint: Point };

/** A shape an arrow end can bind to, plus which side it binds on. */
export type BindableShape = { shape: SketchElement; anchor: AnchorSide };
