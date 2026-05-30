import type { ActiveTool, Point, SketchElement } from "@repo/canvas-core/types";
import {
  panByOffset,
  panByPointerMove,
  zoomAroundScreenPoint,
} from "./viewport";
import { getSelectCursor } from "../tools/select";

type Ref<T> = { current: T };

type CanvasInteraction =
  | { type: "idle" }
  | { type: "drawing" }
  | { type: "panning"; lastScreenPoint: Point };

export type ViewportControllerContext = {
  tool: ActiveTool;
  canvasInteraction: Ref<CanvasInteraction>;
  panOffset: Ref<Point>;
  zoom: Ref<number>;
  elements: Ref<SketchElement[]>;
  isPanning: Ref<boolean>;
  selectedElementsList: () => SketchElement[];
  screenToCanvas: (point: Point) => Point;
  setZoomLevel: (zoom: number) => void;
  scheduleViewportRender: () => void;
};

export function beginPanning(
  ctx: ViewportControllerContext,
  screenPoint: Point,
) {
  ctx.canvasInteraction.current = {
    type: "panning",
    lastScreenPoint: screenPoint,
  };
}

export function handlePanningMove(
  ctx: ViewportControllerContext,
  screenPoint: Point,
) {
  if (ctx.canvasInteraction.current.type !== "panning") return false;

  const interaction = ctx.canvasInteraction.current;
  ctx.panOffset.current = panByPointerMove(
    ctx.panOffset.current,
    interaction.lastScreenPoint,
    screenPoint,
  );
  ctx.canvasInteraction.current = {
    type: "panning",
    lastScreenPoint: screenPoint,
  };
  ctx.scheduleViewportRender();
  return true;
}

export function zoomViewport({
  ctx,
  delta,
  cursorScreen,
  minZoom,
  maxZoom,
}: {
  ctx: ViewportControllerContext;
  delta: number;
  cursorScreen: Point;
  minZoom: number;
  maxZoom: number;
}) {
  const next = zoomAroundScreenPoint({
    currentZoom: ctx.zoom.current,
    panOffset: ctx.panOffset.current,
    cursorScreen,
    delta,
    minZoom,
    maxZoom,
  });
  ctx.zoom.current = next.zoom;
  ctx.setZoomLevel(Math.round(next.zoom * 100));
  ctx.panOffset.current = next.panOffset;
  ctx.scheduleViewportRender();
}

export function panViewport(
  ctx: ViewportControllerContext,
  dx: number,
  dy: number,
) {
  ctx.panOffset.current = panByOffset(ctx.panOffset.current, dx, dy);
  ctx.scheduleViewportRender();
}

export function getCursorForPoint(
  ctx: ViewportControllerContext,
  screenPoint: Point,
): string {
  if (ctx.isPanning.current) return "grab";

  if (ctx.tool === "select") {
    const point = ctx.screenToCanvas(screenPoint);
    return (
      getSelectCursor({
        selected: ctx.selectedElementsList(),
        elements: ctx.elements.current,
        point,
        zoom: ctx.zoom.current,
      }) ?? "crosshair"
    );
  }

  if (ctx.tool === "text") return "text";
  return "crosshair";
}
