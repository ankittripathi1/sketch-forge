type Point = {x: number, y: number}

export function screenToCanvas(
  point: Point,
  zoom: number,
  panOffset: Point,
): Point {
  return {
    x: (point.x - panOffset.x) / zoom,
    y: (point.y - panOffset.y) / zoom,
  };
}

export function canvasToScreen(
  point: Point,
  zoom: number,
  panOffset: Point,
): Point {
  return {
    x: point.x * zoom + panOffset.x,
    y: point.y * zoom + panOffset.y,
  };
}