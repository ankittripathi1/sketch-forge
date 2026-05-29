import { getAnchorPoint } from "@repo/canvas-core/renderElement";
import type {
  AnchorSide,
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

export function eraseIntersectingElements(
  elements: SketchElement[],
  eraser: SketchElement,
): SketchElement[] {
  const minX = Math.min(eraser.x1, eraser.x2);
  const maxX = Math.max(eraser.x1, eraser.x2);
  const minY = Math.min(eraser.y1, eraser.y2);
  const maxY = Math.max(eraser.y1, eraser.y2);

  return elements.filter((el) => {
    const elMinX = Math.min(el.x1, el.x2);
    const elMaxX = Math.max(el.x1, el.x2);
    const elMinY = Math.min(el.y1, el.y2);
    const elMaxY = Math.max(el.y1, el.y2);

    return !(
      elMinX < maxX &&
      elMaxX > minX &&
      elMinY < maxY &&
      elMaxY > minY
    );
  });
}

export function bindArrowEnd(
  arrow: SketchElement,
  findBindableShape: (
    point: Point,
    exclude?: Set<string>,
  ) => { shape: SketchElement; anchor: AnchorSide } | null,
): SketchElement {
  if (arrow.tool !== "arrow") return arrow;

  const exclude = new Set<string>();
  if (arrow.startBinding) exclude.add(arrow.startBinding.elementId);
  const endTarget = findBindableShape({ x: arrow.x2, y: arrow.y2 }, exclude);
  if (!endTarget) return arrow;

  const p = getAnchorPoint(endTarget.shape, endTarget.anchor);
  return {
    ...arrow,
    x2: p.x,
    y2: p.y,
    endBinding: {
      elementId: endTarget.shape.id,
      anchor: endTarget.anchor,
    },
  };
}

export function isStrokeDraft(tool: Tool) {
  return tool === "freehand" || tool === "highlighter";
}
