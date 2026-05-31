import type { Point, SketchElement } from "@repo/element/types";

export type ScribbleStyle = {
  strokeColor: string;
  fontFamily: string;
  fontWeight: "normal" | "bold";
};

/**
 * Build a text element from a recognized handwriting batch. The text element
 * spans the union bounding box of all input strokes; its fontSize is scaled
 * to the stroke height. Returns null if the recognized text is empty.
 */
export function buildTextFromStrokes(
  strokes: Point[][],
  recognizedText: string,
  style: ScribbleStyle,
): SketchElement | null {
  const text = recognizedText.trim();
  if (!text) return null;
  if (!strokes.length) return null;

  const allPts = strokes.flat();
  if (!allPts.length) return null;

  const x1 = Math.min(...allPts.map((p) => p.x));
  const y1 = Math.min(...allPts.map((p) => p.y));
  const x2 = Math.max(...allPts.map((p) => p.x));
  const y2 = Math.max(...allPts.map((p) => p.y));
  const strokeHeight = y2 - y1;

  return {
    id: crypto.randomUUID(),
    tool: "text",
    seed: Math.floor(Math.random() * 100_000),
    strokeColor: style.strokeColor,
    fillColor: "none",
    fillStyle: "none",
    strokeWidth: 0,
    x1,
    y1,
    x2: Math.max(x2, x1 + 40),
    y2: Math.max(y2, y1 + 20),
    text,
    fontFamily: style.fontFamily,
    fontSize: Math.min(Math.max(Math.round(strokeHeight * 0.72), 14), 96),
    fontWeight: style.fontWeight,
  };
}
