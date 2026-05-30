import type { Point, SketchElement } from "@repo/canvas-core/types";

export type TextEditorResult = {
  text: string;
  width: number;
  height: number;
};

export type TextStyle = {
  strokeColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
};

const NON_EDITABLE_LABEL_TOOLS = new Set([
  "image",
  "eraser",
  "line",
  "arrow",
  "freehand",
  "highlighter",
]);

export function canEditTextForElement(el: SketchElement): boolean {
  return el.tool === "text" || !NON_EDITABLE_LABEL_TOOLS.has(el.tool);
}

/** Build a freshly-created text element at the given canvas point. */
export function buildTextElement(
  point: Point,
  result: TextEditorResult,
  style: TextStyle,
): SketchElement {
  return {
    id: crypto.randomUUID(),
    tool: "text",
    seed: Math.floor(Math.random() * 100000),
    strokeColor: style.strokeColor,
    fillColor: "none",
    fillStyle: "none",
    strokeWidth: 0,
    x1: point.x,
    y1: point.y,
    x2: point.x + result.width,
    y2: point.y + result.height,
    text: result.text,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
  };
}

/** Merge an editor result into an existing text element (for edit flow). */
export function applyTextEdit(
  el: SketchElement,
  result: TextEditorResult,
): SketchElement {
  return {
    ...el,
    text: result.text,
    x2: el.x1 + result.width,
    y2: el.y1 + result.height,
  };
}

export function applyShapeTextEdit(
  el: SketchElement,
  result: TextEditorResult,
): SketchElement {
  return {
    ...el,
    text: result.text.trim() || undefined,
  };
}
