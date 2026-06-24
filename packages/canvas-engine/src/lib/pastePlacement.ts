import { getElementsBoundingBox } from "@repo/element/bounds";
import type { Point, SketchElement } from "@repo/element/types";

export type CanvasViewportBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PastePlacementContext = {
  selectedElements: SketchElement[];
  pointer: Point | null;
  viewport: CanvasViewportBounds | null;
  selectionOffset?: number;
};

const DEFAULT_SELECTION_OFFSET = 24;

export function getContextualPasteTranslation(
  copiedElements: SketchElement[],
  context: PastePlacementContext,
): Point {
  if (copiedElements.length === 0) {
    return { x: 0, y: 0 };
  }

  const copiedBounds = getElementsBoundingBox(copiedElements);

  if (context.selectedElements.length > 0) {
    const selectionBounds = getElementsBoundingBox(context.selectedElements);
    const offset = context.selectionOffset ?? DEFAULT_SELECTION_OFFSET;

    return {
      x: selectionBounds.x + offset - copiedBounds.x,
      y: selectionBounds.y + offset - copiedBounds.y,
    };
  }

  if (context.pointer) {
    return {
      x: context.pointer.x - (copiedBounds.x + copiedBounds.w / 2),
      y: context.pointer.y - (copiedBounds.y + copiedBounds.h / 2),
    };
  }

  if (context.viewport) {
    return {
      x:
        context.viewport.x +
        context.viewport.width / 2 -
        (copiedBounds.x + copiedBounds.w / 2),
      y:
        context.viewport.y +
        context.viewport.height / 2 -
        (copiedBounds.y + copiedBounds.h / 2),
    };
  }

  return { x: 0, y: 0 };
}
