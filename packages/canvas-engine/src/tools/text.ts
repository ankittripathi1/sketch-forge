import type { Point, SketchElement } from "@repo/element/types";
import { getBoundingBox } from "@repo/element/bounds";
import { openTextEditor } from "@repo/canvas-core/textEditor";

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

export type TextEditorStyle = TextStyle & {
  zoom: number;
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

export function getTextEditPreviewElement(el: SketchElement): SketchElement {
  return canEditTextForElement(el) && el.tool !== "text"
    ? { ...el, text: undefined }
    : el;
}

export async function openTextCreationEditor({
  screenPoint,
  point,
  style,
}: {
  screenPoint: Point;
  point: Point;
  style: TextEditorStyle;
}): Promise<SketchElement | null> {
  const result = await openTextEditor({
    x: screenPoint.x,
    y: screenPoint.y,
    width: 20,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    color: style.strokeColor,
    zoom: style.zoom,
  });

  if (!result?.text.trim()) return null;
  return buildTextElement(point, result, style);
}

export async function openTextEditEditor({
  element,
  screenPoint,
  style,
}: {
  element: SketchElement;
  screenPoint: Point;
  style: TextEditorStyle;
}): Promise<SketchElement | null> {
  const isTextElement = element.tool === "text";
  const width = isTextElement
    ? Math.abs(element.x2 - element.x1)
    : getBoundingBox(element).w;

  const result = await openTextEditor({
    currentText: element.text ?? "",
    x: screenPoint.x,
    y: screenPoint.y,
    width,
    fontFamily: element.fontFamily ?? style.fontFamily,
    fontSize: element.fontSize ?? style.fontSize,
    fontWeight: element.fontWeight ?? style.fontWeight,
    color: element.strokeColor,
    zoom: style.zoom,
    fixedWidth: true,
    align: isTextElement ? undefined : "center",
  });

  if (result === null) return null;
  return isTextElement
    ? applyTextEdit(element, result)
    : applyShapeTextEdit(element, result);
}
