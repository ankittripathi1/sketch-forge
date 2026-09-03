import type { Point } from "@repo/element/types";
import {
  panByOffset,
  panByPointerMove,
  zoomAroundScreenPoint,
} from "./viewport";
import { getSelectCursor } from "../tools/select";
import type { SketchEditor } from "../editor/sketchEditor";

export function beginPanning(editor: SketchEditor, screenPoint: Point) {
  editor.frame.canvasInteraction = {
    type: "panning",
    lastScreenPoint: screenPoint,
  };
}

export function handlePanningMove(editor: SketchEditor, screenPoint: Point) {
  if (editor.frame.canvasInteraction.type !== "panning") return false;

  const interaction = editor.frame.canvasInteraction;
  editor.frame.panOffset = panByPointerMove(
    editor.frame.panOffset,
    interaction.lastScreenPoint,
    screenPoint,
  );
  editor.frame.canvasInteraction = {
    type: "panning",
    lastScreenPoint: screenPoint,
  };
  editor.scheduleViewportRender();
  return true;
}

export function zoomViewport({
  editor,
  delta,
  cursorScreen,
  minZoom,
  maxZoom,
}: {
  editor: SketchEditor;
  delta: number;
  cursorScreen: Point;
  minZoom: number;
  maxZoom: number;
}) {
  const next = zoomAroundScreenPoint({
    currentZoom: editor.frame.zoom,
    panOffset: editor.frame.panOffset,
    cursorScreen,
    delta,
    minZoom,
    maxZoom,
  });
  editor.frame.zoom = next.zoom;
  editor.setZoomDisplay(Math.round(next.zoom * 100));
  editor.frame.panOffset = next.panOffset;
  editor.scheduleViewportRender();
}

export function panViewport(editor: SketchEditor, dx: number, dy: number) {
  editor.frame.panOffset = panByOffset(editor.frame.panOffset, dx, dy);
  editor.scheduleViewportRender();
}

export function getCursorForPoint(
  editor: SketchEditor,
  screenPoint: Point,
): string {
  if (editor.frame.isPanning) return "grab";

  if (editor.getState().activeTool === "select") {
    const point = editor.screenToCanvas(screenPoint);
    return (
      getSelectCursor({
        selected: editor.selectedElementsList(),
        elements: editor.frame.elements,
        point,
        zoom: editor.frame.zoom,
      }) ?? "crosshair"
    );
  }

  if (editor.getState().activeTool === "text") return "text";
  return "crosshair";
}
