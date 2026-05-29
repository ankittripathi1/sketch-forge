import type { Point } from "@repo/canvas-core/types";
import { screenToCanvas } from "./transform";

export function panByOffset(panOffset: Point, dx: number, dy: number): Point {
  return {
    x: panOffset.x + dx,
    y: panOffset.y + dy,
  };
}

export function panByPointerMove(
  panOffset: Point,
  previousScreenPoint: Point,
  nextScreenPoint: Point,
): Point {
  return panByOffset(
    panOffset,
    nextScreenPoint.x - previousScreenPoint.x,
    nextScreenPoint.y - previousScreenPoint.y,
  );
}

export function zoomAroundScreenPoint({
  currentZoom,
  panOffset,
  cursorScreen,
  delta,
  minZoom,
  maxZoom,
}: {
  currentZoom: number;
  panOffset: Point;
  cursorScreen: Point;
  delta: number;
  minZoom: number;
  maxZoom: number;
}): { zoom: number; panOffset: Point } {
  const zoom = Math.min(maxZoom, Math.max(minZoom, currentZoom * (1 + delta)));
  const cursorCanvas = screenToCanvas(cursorScreen, currentZoom, panOffset);

  return {
    zoom,
    panOffset: {
      x: cursorScreen.x - cursorCanvas.x * zoom,
      y: cursorScreen.y - cursorCanvas.y * zoom,
    },
  };
}
