import type { SketchElement, AnchorSide } from "./types";
import { getBoundingBox } from "./bounds";

/** Returns the canvas-space point for the named anchor on a shape's bbox. */
export function getAnchorPoint(
  shape: SketchElement,
  anchor: AnchorSide,
): { x: number; y: number } {
  const { x, y, w, h } = getBoundingBox(shape);
  if (anchor === "top") return { x: x + w / 2, y };
  if (anchor === "bottom") return { x: x + w / 2, y: y + h };
  if (anchor === "left") return { x, y: y + h / 2 };
  return { x: x + w, y: y + h / 2 };
}

/** Returns all four edge anchor points for hover-feedback rendering. */
export function getAllAnchorPoints(
  shape: SketchElement,
): { side: AnchorSide; x: number; y: number }[] {
  return (["top", "right", "bottom", "left"] as const).map((side) => ({
    side,
    ...getAnchorPoint(shape, side),
  }));
}

/**
 * Resolves an arrow element's endpoints from any bindings. For unbound arrows
 * (or non-arrows) returns the literal stored coordinates.
 */
export function resolveArrowEndpoints(
  el: SketchElement,
  allElements: SketchElement[],
): { x1: number; y1: number; x2: number; y2: number } {
  if (el.tool !== "arrow" || (!el.startBinding && !el.endBinding)) {
    return { x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2 };
  }
  let x1 = el.x1;
  let y1 = el.y1;
  let x2 = el.x2;
  let y2 = el.y2;

  if (el.startBinding) {
    const shape = allElements.find((e) => e.id === el.startBinding!.elementId);
    if (shape) {
      const p = getAnchorPoint(shape, el.startBinding.anchor);
      x1 = p.x;
      y1 = p.y;
    }
  }
  if (el.endBinding) {
    const shape = allElements.find((e) => e.id === el.endBinding!.elementId);
    if (shape) {
      const p = getAnchorPoint(shape, el.endBinding.anchor);
      x2 = p.x;
      y2 = p.y;
    }
  }
  return { x1, y1, x2, y2 };
}
