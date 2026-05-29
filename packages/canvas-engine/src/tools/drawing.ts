import type {
  ArrowBinding,
  FillStyle,
  Point,
  SketchElement,
  Tool,
} from "@repo/canvas-core/types";

export type DrawingStyle = {
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
};

export function buildDraftElement({
  tool,
  point,
  style,
  startBinding,
  startPoint = point,
}: {
  tool: Tool;
  point: Point;
  style: DrawingStyle;
  startBinding?: ArrowBinding;
  startPoint?: Point;
}): SketchElement {
  return {
    id: crypto.randomUUID(),
    tool,
    seed: Math.floor(Math.random() * 100000),
    strokeColor: style.strokeColor,
    fillColor: style.fillColor,
    fillStyle: style.fillStyle,
    strokeWidth: style.strokeWidth,
    x1: startPoint.x,
    y1: startPoint.y,
    x2: point.x,
    y2: point.y,
    points:
      tool === "freehand" || tool === "highlighter" ? [point] : undefined,
    opacity: tool === "highlighter" ? 0.35 : undefined,
    startBinding,
  };
}

export function updateDraftElement(
  element: SketchElement,
  point: Point,
  endPoint: Point = point,
): SketchElement {
  return {
    ...element,
    x2: endPoint.x,
    y2: endPoint.y,
    points: element.points ? [...element.points, point] : undefined,
  };
}
