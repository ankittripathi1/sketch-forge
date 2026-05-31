import type {
  AnchorSide,
  FillStyle,
  Point,
  SketchElement,
  Tool,
} from "@repo/element/types";
import { clearCanvas } from "../lib/transform";
import {
  bindArrowEnd,
  buildDraftElement,
  eraseIntersectingElements,
  getDraftEnd,
  getDraftStart,
  isStrokeDraft,
  updateDraftElement,
} from "./drawing";

type Ref<T> = { current: T };

type BindableShape = { shape: SketchElement; anchor: AnchorSide };

export type CanvasInteraction =
  | { type: "idle" }
  | { type: "drawing" }
  | { type: "panning"; lastScreenPoint: Point };

export type DrawingControllerContext = {
  tool: Tool;
  style: {
    strokeColor: string;
    fillColor: string;
    fillStyle: FillStyle;
    strokeWidth: number;
  };
  canvasInteraction: Ref<CanvasInteraction>;
  currentElement: Ref<SketchElement | null>;
  hoveredAnchor: Ref<BindableShape | null>;
  elements: Ref<SketchElement[]>;
  interactionCanvas: Ref<HTMLCanvasElement | null>;
  rafId: Ref<number>;
  scribbleEnabled: boolean;
  queueScribble: (id: string) => void;
  findBindableShape: (
    point: Point,
    exclude?: Set<string>,
  ) => BindableShape | null;
  normalizeElement: (element: SketchElement) => SketchElement;
  commitCreatedElement: (
    element: SketchElement,
    options?: { select?: boolean; nextTool?: Tool | "select" },
  ) => void;
  commitSceneElements: (elements: SketchElement[]) => void;
  renderActiveElement: () => void;
  renderScene: () => void;
  renderSceneAndSelection: () => void;
  scheduleActiveElementRender: () => void;
};

export function startDrawing(ctx: DrawingControllerContext, point: Point) {
  ctx.canvasInteraction.current = { type: "drawing" };
  const { startBinding, startPoint } = getDraftStart({
    tool: ctx.tool,
    point,
    findBindableShape: ctx.findBindableShape,
  });
  ctx.currentElement.current = buildDraftElement({
    tool: ctx.tool,
    point,
    style: ctx.style,
    startBinding,
    startPoint,
  });
  ctx.renderActiveElement();
}

export function updateArrowHover(ctx: DrawingControllerContext, point: Point) {
  if (ctx.tool !== "arrow" || ctx.canvasInteraction.current.type === "drawing")
    return false;

  const target = ctx.findBindableShape(point);
  const next = target ? { shape: target.shape, anchor: target.anchor } : null;
  const prev = ctx.hoveredAnchor.current;
  const changed =
    (!prev && next) ||
    (prev && !next) ||
    (prev &&
      next &&
      (prev.shape.id !== next.shape.id || prev.anchor !== next.anchor));
  if (changed) {
    ctx.hoveredAnchor.current = next;
    ctx.scheduleActiveElementRender();
  }
  return true;
}

export function handleDrawingPointerMove(
  ctx: DrawingControllerContext,
  point: Point,
) {
  if (
    ctx.canvasInteraction.current.type !== "drawing" ||
    !ctx.currentElement.current
  )
    return;

  const { endPoint, anchorHint } = getDraftEnd({
    element: ctx.currentElement.current,
    point,
    findBindableShape: ctx.findBindableShape,
  });
  ctx.hoveredAnchor.current = anchorHint;

  ctx.currentElement.current = updateDraftElement(
    ctx.currentElement.current,
    point,
    endPoint,
  );
  ctx.scheduleActiveElementRender();
}

export function finalizeDrawingInteraction(ctx: DrawingControllerContext) {
  if (
    ctx.canvasInteraction.current.type !== "drawing" ||
    !ctx.currentElement.current
  )
    return;

  ctx.canvasInteraction.current = { type: "idle" };
  cancelAnimationFrame(ctx.rafId.current);

  if (ctx.tool === "eraser") {
    const nextElements = eraseIntersectingElements(
      ctx.elements.current,
      ctx.currentElement.current,
    );
    ctx.currentElement.current = null;
    ctx.commitSceneElements(nextElements);
    ctx.renderSceneAndSelection();
    return;
  }

  let justCreated = ctx.normalizeElement(ctx.currentElement.current);
  ctx.currentElement.current = null;
  ctx.hoveredAnchor.current = null;

  justCreated = bindArrowEnd(justCreated, ctx.findBindableShape);

  if (isStrokeDraft(ctx.tool)) {
    ctx.commitCreatedElement(justCreated, { select: false });
    ctx.renderScene();

    if (ctx.tool === "freehand" && ctx.scribbleEnabled) {
      ctx.queueScribble(justCreated.id);
    }

    const interactionCanvas = ctx.interactionCanvas.current;
    if (interactionCanvas) clearCanvas(interactionCanvas);
    return;
  }

  ctx.commitCreatedElement(justCreated);
}
