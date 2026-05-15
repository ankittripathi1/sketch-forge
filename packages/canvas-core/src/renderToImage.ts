import rough from "roughjs";
import { drawElement } from "./renderElement";
import { getBoundingBox } from "./hitDetection";
import type { SketchElement } from "./types";

export interface RenderOptions {
  width?: number;
  height?: number;
  scale?: number;
  backgroundColor?: string;
  padding?: number;
}

/**
 * Renders a set of SketchElements to a PNG Blob.
 * Designed to work in both main thread and Web Workers (using OffscreenCanvas).
 */
export async function renderCanvasToBlob(
  elements: SketchElement[],
  options: RenderOptions = {},
): Promise<Blob> {
  const {
    width = 400,
    height = 300,
    scale = 1,
    backgroundColor = "#ffffff",
    padding = 20,
  } = options;

  // Use OffscreenCanvas if available, otherwise regular Canvas (for browser main thread)
  const isOffscreenAvailable = typeof OffscreenCanvas !== "undefined";
  const canvas = isOffscreenAvailable
    ? new OffscreenCanvas(width, height)
    : document.createElement("canvas");

  if (!isOffscreenAvailable) {
    (canvas as HTMLCanvasElement).width = width;
    (canvas as HTMLCanvasElement).height = height;
  }

  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  if (!ctx) throw new Error("Could not get canvas context");

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  if (elements.length > 0) {
    // Calculate bounding box of all elements
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach((el) => {
      const box = getBoundingBox(el);
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.w);
      maxY = Math.max(maxY, box.y + box.h);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Calculate scale to fit with padding
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    const fitScale = Math.min(
      availableWidth / Math.max(contentWidth, 1),
      availableHeight / Math.max(contentHeight, 1),
      scale
    );

    // Center the content
    const offsetX = (width - contentWidth * fitScale) / 2 - minX * fitScale;
    const offsetY = (height - contentHeight * fitScale) / 2 - minY * fitScale;

    ctx.save();
    ctx.setTransform(fitScale, 0, 0, fitScale, offsetX, offsetY);

    // roughjs might expect HTMLCanvasElement, but OffscreenCanvas often works
    // if we cast it.
    const rc = rough.canvas(canvas as any);

    // Note: drawElement might fail for images in Workers because of HTMLImageElement usage.
    // In a real production app, we'd need to pre-load images as ImageBitmap in Workers.
    elements.forEach((el) => {
      try {
        drawElement(rc, el);
      } catch (e) {
        console.warn("Failed to draw element during thumbnail generation", e);
      }
    });

    ctx.restore();
  }

  if (isOffscreenAvailable) {
    return (canvas as OffscreenCanvas).convertToBlob({ type: "image/png" });
  } else {
    return new Promise((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, "image/png");
    });
  }
}
