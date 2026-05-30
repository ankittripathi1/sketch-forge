import type { FillStyle, SketchElement, Tool } from "@repo/canvas-core/types";
import {
  getToolbarStyleFromElement,
  getToolTransitionStyle,
  type ToolbarStyle,
} from "./toolStyle";
import type { TextEditorStyle } from "../tools/text";

export type ToolStyleControllerContext = {
  tool: Tool;
  canvasMode: "light" | "dark";
  strokeColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  zoom: number;
  setTool: (tool: Tool) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setFillStyle: (style: FillStyle) => void;
  setStrokeWidth: (width: number) => void;
  setFontFamily: (font: string) => void;
  setFontSize: (size: number) => void;
  setFontWeight: (weight: "normal" | "bold") => void;
  setTextAlign: (align: "left" | "center" | "right") => void;
  setTextVerticalAlign: (align: "top" | "middle" | "bottom") => void;
  updateSelectedElements: (updates: Partial<SketchElement>) => void;
  commitSelectedElements: () => void;
};

export function applyToolbarStyle(
  ctx: ToolStyleControllerContext,
  style: ToolbarStyle,
) {
  ctx.setStrokeColor(style.strokeColor);
  ctx.setFillColor(style.fillColor);
  ctx.setFillStyle(style.fillStyle);
  ctx.setStrokeWidth(style.strokeWidth);
  if (style.fontFamily) ctx.setFontFamily(style.fontFamily);
  if (style.fontSize) ctx.setFontSize(style.fontSize);
  if (style.fontWeight) ctx.setFontWeight(style.fontWeight);
  if (style.textAlign) ctx.setTextAlign(style.textAlign);
  if (style.textVerticalAlign)
    ctx.setTextVerticalAlign(style.textVerticalAlign);
}

export function syncToolbarStyleFromElement(
  ctx: ToolStyleControllerContext,
  element: SketchElement,
) {
  applyToolbarStyle(ctx, getToolbarStyleFromElement(element));
}

export function applyTool(ctx: ToolStyleControllerContext, nextTool: Tool) {
  if (ctx.tool !== nextTool) {
    ctx.commitSelectedElements();
  }
  ctx.setTool(nextTool);

  const style = getToolTransitionStyle({
    currentTool: ctx.tool,
    nextTool,
    canvasMode: ctx.canvasMode,
  });
  if (style) applyToolbarStyle(ctx, style);
}

export function getTextEditorStyle(
  ctx: ToolStyleControllerContext,
): TextEditorStyle {
  return {
    strokeColor: ctx.strokeColor,
    fontFamily: ctx.fontFamily,
    fontSize: ctx.fontSize,
    fontWeight: ctx.fontWeight,
    zoom: ctx.zoom,
  };
}

export function applyStrokeColor(
  ctx: ToolStyleControllerContext,
  color: string,
) {
  ctx.setStrokeColor(color);
  ctx.updateSelectedElements({ strokeColor: color });
}

export function applyFillColor(ctx: ToolStyleControllerContext, color: string) {
  ctx.setFillColor(color);
  ctx.updateSelectedElements({ fillColor: color });
}

export function applyFillStyle(
  ctx: ToolStyleControllerContext,
  style: FillStyle,
) {
  ctx.setFillStyle(style);
  ctx.updateSelectedElements({ fillStyle: style });
}

export function applyStrokeWidth(
  ctx: ToolStyleControllerContext,
  width: number,
) {
  ctx.setStrokeWidth(width);
  ctx.updateSelectedElements({ strokeWidth: width });
}

export function applyFontFamily(ctx: ToolStyleControllerContext, font: string) {
  ctx.setFontFamily(font);
  ctx.updateSelectedElements({ fontFamily: font });
}

export function applyFontSize(ctx: ToolStyleControllerContext, size: number) {
  ctx.setFontSize(size);
  ctx.updateSelectedElements({ fontSize: size });
}

export function applyFontWeight(
  ctx: ToolStyleControllerContext,
  weight: "normal" | "bold",
) {
  ctx.setFontWeight(weight);
  ctx.updateSelectedElements({ fontWeight: weight });
}

export function applyTextAlign(
  ctx: ToolStyleControllerContext,
  align: "left" | "center" | "right",
) {
  ctx.setTextAlign(align);
  ctx.updateSelectedElements({ textAlign: align });
}

export function applyTextVerticalAlign(
  ctx: ToolStyleControllerContext,
  align: "top" | "middle" | "bottom",
) {
  ctx.setTextVerticalAlign(align);
  ctx.updateSelectedElements({ textVerticalAlign: align });
}
