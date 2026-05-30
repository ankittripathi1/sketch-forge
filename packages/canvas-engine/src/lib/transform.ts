import { Point } from "@repo/canvas-core";


export function getDeviceScale(canvas: HTMLCanvasElement): number {
  const rect = canvas.getBoundingClientRect();
  return rect.width > 0 ? canvas.width / rect.width : 1;
}

export function applyTransform(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  zoom: number,
  panOffset: Point,
): void {
  const scale = getDeviceScale(canvas);
  ctx.setTransform(
    zoom * scale,
    0,
    0,
    zoom * scale,
    panOffset.x * scale,
    panOffset.y * scale,
  );
}

export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
