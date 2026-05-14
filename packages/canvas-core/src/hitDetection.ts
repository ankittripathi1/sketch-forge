import { Point, SketchElement } from "./types";

export function getBoundingBox(el: SketchElement) {
  if (
    (el.tool === "freehand" || el.tool === "highlighter") &&
    el.points &&
    el.points.length > 0
  ) {
    const xs = el.points.map((p) => p.x);
    const ys = el.points.map((p) => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  const x = Math.min(el.x1, el.x2);
  const y = Math.min(el.y1, el.y2);
  return { x, y, w: Math.abs(el.x2 - el.x1), h: Math.abs(el.y2 - el.y1) };
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function hitTestElement(
  el: SketchElement,
  point: Point,
  threshold = 8,
): boolean {
  if (el.tool === "line") {
    return (
      distToSegment(point, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }) <
      threshold
    );
  }

  if (
    (el.tool === "freehand" || el.tool === "highlighter") &&
    el.points &&
    el.points.length > 1
  ) {
    const strokeThreshold =
      el.tool === "highlighter"
        ? Math.max(threshold, el.strokeWidth / 2)
        : threshold;
    for (let i = 0; i < el.points.length - 1; i++) {
      if (
        distToSegment(point, el.points[i]!, el.points[i + 1]!) <
        strokeThreshold
      )
        return true;
    }
    return false;
  }

  const { x, y, w, h } = getBoundingBox(el);
  return (
    point.x >= x - threshold &&
    point.x <= x + w + threshold &&
    point.y >= y - threshold &&
    point.y <= y + h + threshold
  );
}

export function hitTestHandle(
  el: SketchElement,
  point: Point,
  pad: number,
  zoom: number,
): number | null {
  const { x, y, w, h } = getBoundingBox(el);
  const handles: [number, number][] = [
    [x - pad, y - pad],
    [x + w / 2, y - pad],
    [x + w + pad, y - pad],
    [x - pad, y + h / 2],
    [x + w + pad, y + h / 2],
    [x - pad, y + h + pad],
    [x + w / 2, y + h + pad],
    [x + w + pad, y + h + pad],
  ];
  const hitRadius = 10 / zoom;
  for (let i = 0; i < handles.length; i++) {
    const [hx, hy] = handles[i]!;
    if (Math.hypot(point.x - hx, point.y - hy) < hitRadius) return i;
  }
  return null;
}

export function isElementInsideRect(
  el: SketchElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean {
  const bbox = getBoundingBox(el);
  const rx = Math.min(x1, x2);
  const ry = Math.min(y1, y2);
  const rw = Math.abs(x2 - x1);
  const rh = Math.abs(y2 - y1);
  return (
    bbox.x >= rx &&
    bbox.y >= ry &&
    bbox.x + bbox.w <= rx + rw &&
    bbox.y + bbox.h <= ry + rh
  );
}
