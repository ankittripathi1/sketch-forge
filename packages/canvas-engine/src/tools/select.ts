import type { Point, SketchElement } from "@repo/canvas-core/types";
import {
  getBoundingBox,
  getElementsBoundingBox,
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

export type SelectPointerDownAction =
  | { type: "start-drag" }
  | { type: "start-resize"; handle: number; origin: SketchElement }
  | { type: "toggle-element"; element: SketchElement }
  | { type: "select-element"; element: SketchElement }
  | { type: "clear-selection" }
  | { type: "start-marquee"; marquee: SelectionMarquee; additive: boolean }
  | { type: "none" };

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

export function isPointInsideSelectionBounds(
  selected: SketchElement[],
  point: Point,
  padding = 0,
) {
  if (selected.length === 0) return false;
  const { x, y, w, h } =
    selected.length === 1
      ? getBoundingBox(selected[0]!)
      : getElementsBoundingBox(selected);

  return (
    point.x >= x - padding &&
    point.x <= x + w + padding &&
    point.y >= y - padding &&
    point.y <= y + h + padding
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

export function getSelectPointerDownAction({
  point,
  selected,
  elements,
  zoom,
  shiftKey,
}: {
  point: Point;
  selected: SketchElement[];
  elements: SketchElement[];
  zoom: number;
  shiftKey: boolean;
}): SelectPointerDownAction {
  const tolerance = 8 / zoom;

  if (selected.length > 1 && !shiftKey) {
    const hitSelected = findHitSelectedElement(selected, point, tolerance);
    const hitGroupBounds = isPointInsideSelectionBounds(
      selected,
      point,
      tolerance,
    );
    if (hitSelected || hitGroupBounds) return { type: "start-drag" };
  }

  const handle = findSingleSelectionHandle(
    selected,
    point,
    6 / zoom,
    zoom,
    elements,
  );
  if (handle !== null && selected.length === 1) {
    return { type: "start-resize", handle, origin: { ...selected[0]! } };
  }

  const hit = findHitElement(elements, point, tolerance);
  if (hit) {
    return shiftKey
      ? { type: "toggle-element", element: hit }
      : { type: "select-element", element: hit };
  }

  if (selected.length > 0) {
    return isPointInsideSelectionBounds(selected, point, tolerance)
      ? { type: "none" }
      : { type: "clear-selection" };
  }

  return {
    type: "start-marquee",
    marquee: createSelectionMarquee(point),
    additive: shiftKey,
  };
}
