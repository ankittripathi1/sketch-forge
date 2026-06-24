import type { SketchElement, Point, AnchorSide } from "./types";
import {
  getAnchorPoint,
  getAllAnchorPoints,
  resolveArrowEndpoints,
} from "./binding";
import { hitTestElement, getBoundingBox } from "./bounds";
import { measureTextBox } from "./text";

export function normalizeElement(el: SketchElement): SketchElement {
  if (
    el.tool === "line" ||
    el.tool === "arrow" ||
    el.tool === "freehand" ||
    el.tool === "highlighter"
  ) {
    return el;
  }
  return {
    ...el,
    x1: Math.min(el.x1, el.x2),
    y1: Math.min(el.y1, el.y2),
    x2: Math.max(el.x1, el.x2),
    y2: Math.max(el.y1, el.y2),
  };
}

export function findBindableShape(
  point: Point,
  allElements: SketchElement[],
  zoom: number,
  exclude: Set<string> = new Set(),
): { shape: SketchElement; anchor: AnchorSide } | null {
  for (let i = allElements.length - 1; i >= 0; i--) {
    const el = allElements[i]!;
    if (exclude.has(el.id)) continue;
    if (
      el.tool !== "rectangle" &&
      el.tool !== "ellipse" &&
      el.tool !== "diamond"
    )
      continue;
    if (hitTestElement(el, point, 8 / zoom)) {
      const anchors = getAllAnchorPoints(el);
      let best = anchors[0]!;
      let bestDist = Infinity;
      for (const a of anchors) {
        const d = Math.hypot(point.x - a.x, point.y - a.y);
        if (d < bestDist) {
          bestDist = d;
          best = a;
        }
      }
      return { shape: el, anchor: best.side };
    }
  }
  return null;
}

export function syncBoundArrows(
  shapeIds: Set<string>,
  list: SketchElement[],
  allShapes: SketchElement[],
): SketchElement[] {
  return list.map((el) => {
    if (el.tool !== "arrow") return el;
    let next = el;
    if (el.startBinding && shapeIds.has(el.startBinding.elementId)) {
      const target = allShapes.find((e) => e.id === el.startBinding!.elementId);
      if (target) {
        const p = getAnchorPoint(target, el.startBinding.anchor);
        next = { ...next, x1: p.x, y1: p.y };
      }
    }
    if (el.endBinding && shapeIds.has(el.endBinding.elementId)) {
      const target = allShapes.find((e) => e.id === el.endBinding!.elementId);
      if (target) {
        const p = getAnchorPoint(target, el.endBinding.anchor);
        next = { ...next, x2: p.x, y2: p.y };
      }
    }
    return next;
  });
}

export function applyResize(
  el: SketchElement,
  handle: number,
  to: Point,
  allElements: SketchElement[],
  zoom: number,
): SketchElement {
  if (el.tool === "arrow") {
    const ends = resolveArrowEndpoints(el, allElements);
    if (handle === 0) {
      const target = findBindableShape(to, allElements, zoom, new Set([el.id]));
      if (target) {
        const p = getAnchorPoint(target.shape, target.anchor);
        return {
          ...el,
          x1: p.x,
          y1: p.y,
          startBinding: { elementId: target.shape.id, anchor: target.anchor },
        };
      }
      return { ...el, x1: to.x, y1: to.y, startBinding: undefined };
    }
    if (handle === 2) {
      const exclude = new Set<string>([el.id]);
      if (el.startBinding) exclude.add(el.startBinding.elementId);
      const target = findBindableShape(to, allElements, zoom, exclude);
      if (target) {
        const p = getAnchorPoint(target.shape, target.anchor);
        return {
          ...el,
          x2: p.x,
          y2: p.y,
          endBinding: { elementId: target.shape.id, anchor: target.anchor },
        };
      }
      return { ...el, x2: to.x, y2: to.y, endBinding: undefined };
    }
    const dx = ends.x2 - ends.x1;
    const dy = ends.y2 - ends.y1;
    const len = Math.hypot(dx, dy) || 1;
    const mx = (ends.x1 + ends.x2) / 2;
    const my = (ends.y1 + ends.y2) / 2;
    const bend = ((to.x - mx) * -dy + (to.y - my) * dx) / len;
    return { ...el, bend };
  }

  const { x, y, w, h } = getBoundingBox(el);
  let nx1 = el.x1,
    ny1 = el.y1,
    nx2 = el.x2,
    ny2 = el.y2;
  const isCornerHandle = [0, 2, 5, 7].includes(handle);

  if (isCornerHandle && w > 0 && h > 0) {
    const movesLeft = [0, 3, 5].includes(handle);
    const movesTop = [0, 1, 2].includes(handle);
    const anchorX = movesLeft ? x + w : x;
    const anchorY = movesTop ? y + h : y;
    const scale = Math.max(
      Math.abs(to.x - anchorX) / w,
      Math.abs(to.y - anchorY) / h,
    );
    const nextW = w * scale;
    const nextH = h * scale;
    const nextX = movesLeft ? anchorX - nextW : anchorX;
    const nextY = movesTop ? anchorY - nextH : anchorY;

    if (el.tool === "line") {
      return {
        ...el,
        x1: nextX + (el.x1 - x) * scale,
        y1: nextY + (el.y1 - y) * scale,
        x2: nextX + (el.x2 - x) * scale,
        y2: nextY + (el.y2 - y) * scale,
      };
    }

    if (el.tool === "freehand" || el.tool === "highlighter") {
      return {
        ...el,
        x1: nextX,
        y1: nextY,
        x2: nextX + nextW,
        y2: nextY + nextH,
        points: el.points?.map((p) => ({
          x: nextX + (p.x - x) * scale,
          y: nextY + (p.y - y) * scale,
        })),
      };
    }

    return {
      ...el,
      x1: nextX,
      y1: nextY,
      x2: nextX + nextW,
      y2: nextY + nextH,
    };
  }

  const scaleX = w > 0 ? (to.x - x) / w : 1;
  const scaleY = h > 0 ? (to.y - y) / h : 1;

  switch (handle) {
    case 0:
      nx1 = to.x;
      ny1 = to.y;
      break;
    case 1:
      ny1 = to.y;
      break;
    case 2:
      nx2 = to.x;
      ny1 = to.y;
      break;
    case 3:
      nx1 = to.x;
      break;
    case 4:
      nx2 = to.x;
      break;
    case 5:
      nx1 = to.x;
      ny2 = to.y;
      break;
    case 6:
      ny2 = to.y;
      break;
    case 7:
      nx2 = to.x;
      ny2 = to.y;
      break;
  }

  if (el.tool === "freehand" || el.tool === "highlighter") {
    return {
      ...el,
      x1: nx1,
      y1: ny1,
      x2: nx2,
      y2: ny2,
      points: el.points?.map((p) => ({
        x: x + (p.x - x) * scaleX,
        y: y + (p.y - y) * scaleY,
      })),
    };
  }

  return { ...el, x1: nx1, y1: ny1, x2: nx2, y2: ny2 };
}

export function applyResizeWithTextMeasurement({
  element,
  handle,
  to,
  allElements,
  zoom,
  fontFamily,
  fontSize,
  fontWeight,
}: {
  element: SketchElement;
  handle: number;
  to: Point;
  allElements: SketchElement[];
  zoom: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
}): SketchElement {
  const resized = applyResize(element, handle, to, allElements, zoom);
  if (resized.tool !== "text" || !resized.text) return resized;

  const family = resized.fontFamily ?? fontFamily;
  const weight = resized.fontWeight ?? fontWeight;
  const isHorizontalSide = handle === 3 || handle === 4;

  // Corner or vertical-side drag (Excalidraw-style): scale the font size by how
  // much the box grew vertically and let the text re-fit. Wrapping mode is
  // preserved — auto-width text stays single-line, fixed-width text re-wraps at
  // the scaled width.
  if (!isHorizontalSide) {
    const before = getBoundingBox(element);
    const after = getBoundingBox(resized);
    // Uniform scale derived from the vertical growth. Scale font AND width by
    // the same factor so the wrap stays identical — that keeps height growth
    // proportional instead of runaway re-wrapping (Excalidraw behavior).
    const scale = before.h > 0 ? after.h / before.h : 1;
    const nextFontSize = Math.max(4, (element.fontSize ?? fontSize) * scale);
    const autoWidth = element.autoWidth !== false;
    const nextWidth = Math.max(before.w * scale, 20);
    const measured = measureTextBox(resized.text, {
      fontFamily: family,
      fontSize: nextFontSize,
      fontWeight: weight,
      width: autoWidth ? 20 : nextWidth,
      fixedWidth: !autoWidth,
    });
    return {
      ...resized,
      fontSize: nextFontSize,
      x1: after.x,
      y1: after.y,
      x2: after.x + (autoWidth ? measured.width : nextWidth),
      y2: after.y + measured.height,
    };
  }

  // Horizontal side drag: lock the new width, switch to fixed-width mode, and
  // wrap the text — height grows to fit.
  const { x, y, w } = getBoundingBox(resized);
  const boxWidth = Math.max(w, 20);
  const measured = measureTextBox(resized.text, {
    fontFamily: family,
    fontSize: resized.fontSize ?? fontSize,
    fontWeight: weight,
    width: boxWidth,
    fixedWidth: true,
  });

  return {
    ...resized,
    autoWidth: false,
    x1: x,
    x2: x + boxWidth,
    y1: y,
    y2: y + measured.height,
  };
}
