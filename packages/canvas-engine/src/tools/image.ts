import type { Point, SketchElement } from "@repo/element/types";
import { randomId } from "@repo/common";

export function buildImageElement(point: Point, src: string): SketchElement {
  return {
    id: randomId(),
    tool: "image",
    seed: Math.floor(Math.random() * 100000),
    strokeColor: "#000000",
    fillColor: "none",
    fillStyle: "none",
    strokeWidth: 0,
    x1: point.x,
    y1: point.y,
    x2: point.x + 200,
    y2: point.y + 200,
    src,
  };
}

/** Returns the first image file found on a clipboard/drag payload, if any. */
export function getImageFileFromTransfer(
  data: DataTransfer | null,
): File | null {
  if (!data) return null;
  for (const item of data.items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  // Fallback for browsers that only populate `files`.
  for (const file of data.files) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

/** Reads an image `File` as a data URL. */
export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
