import type { Point, SketchElement } from "@repo/canvas-core/types";
import {
  getBoundingBox,
  hitTestElement,
  hitTestHandle,
  isElementInsideRect,
} from "@repo/canvas-core/hitDetection";

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

export function findHitSelectedElement(
  selected: SketchElement[],
  point: Point,
  tolerance: number,
) {
  return selected
    .slice()
    .reverse()
    .find((el) => hitTestElement(el, point, tolerance));
}

export function findHitElement(
  elements: SketchElement[],
  point: Point,
  tolerance: number,
) {
  return [...elements]
    .reverse()
    .find((el) => hitTestElement(el, point, tolerance));
}

export function findSingleSelectionHandle(
  selected: SketchElement[],
  point: Point,
  tolerance: number,
  zoom: number,
  allElements: SketchElement[],
) {
  if (selected.length !== 1) return null;
  return hitTestHandle(selected[0]!, point, tolerance, zoom, allElements);
}

export function isOutsidePrimarySelectionBounds(
  selected: SketchElement[],
  point: Point,
  canvasToScreen: (point: Point) => Point,
) {
  if (selected.length === 0) return false;
  const boxPoint = canvasToScreen(point);
  const { x, y, w, h } = getBoundingBox(selected[0]!);
  const sMin = canvasToScreen({ x, y });
  const sMax = canvasToScreen({ x: x + w, y: y + h });

  return (
    boxPoint.x < sMin.x ||
    boxPoint.x > sMax.x ||
    boxPoint.y < sMin.y ||
    boxPoint.y > sMax.y
  );
}

export function createSelectionMarquee(point: Point): SelectionMarquee {
  return {
    x1: point.x,
    y1: point.y,
    x2: point.x,
    y2: point.y,
  };
}

export function updateSelectionMarquee(
  marquee: SelectionMarquee,
  point: Point,
): SelectionMarquee {
  return {
    ...marquee,
    x2: point.x,
    y2: point.y,
  };
}

export function getMarqueeSelectedIds(
  elements: SketchElement[],
  marquee: SelectionMarquee,
) {
  return elements
    .filter((el) =>
      isElementInsideRect(el, marquee.x1, marquee.y1, marquee.x2, marquee.y2),
    )
    .map((el) => el.id);
}

export function moveSelectedElements(
  elements: SketchElement[],
  selectedIds: Set<string>,
  dx: number,
  dy: number,
) {
  return elements.map((el) =>
    selectedIds.has(el.id)
      ? {
          ...el,
          x1: el.x1 + dx,
          y1: el.y1 + dy,
          x2: el.x2 + dx,
          y2: el.y2 + dy,
          points: el.points?.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        }
      : el,
  );
}
