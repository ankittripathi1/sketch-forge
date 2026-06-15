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
