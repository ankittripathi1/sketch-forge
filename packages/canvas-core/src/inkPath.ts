import type { Point } from "./types";

export type SmoothStrokeContext = Pick<
  CanvasRenderingContext2D,
  "moveTo" | "lineTo" | "quadraticCurveTo"
>;

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function drawSmoothStrokePath(
  ctx: SmoothStrokeContext,
  points: Point[],
) {
  const first = points[0];
  if (!first) return;

  ctx.moveTo(first.x, first.y);

  if (points.length === 1) return;

  if (points.length === 2) {
    const last = points[1]!;
    ctx.lineTo(last.x, last.y);
    return;
  }

  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i]!;
    const next = points[i + 1]!;
    const mid = midpoint(point, next);
    ctx.quadraticCurveTo(point.x, point.y, mid.x, mid.y);
  }

  const last = points[points.length - 1]!;
  ctx.lineTo(last.x, last.y);
}
