import { SketchElement } from "./canvas.js";

/**
 * Extracts all text content from an array of sketch elements.
 * Joins text from "text" elements and normalize whitespace.
 */
export function extractSearchableText(elements: SketchElement[]): string {
  if (!elements || !Array.isArray(elements)) return "";

  const textParts = elements
    .filter((el) => el.text && (el as any).tool === "text")
    .map((el) => el.text!.trim());

  // Join with spaces and normalize whitespace
  return textParts.join(" ").replace(/\s+/g, " ").trim();
}
