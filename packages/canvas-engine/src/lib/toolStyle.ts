import type {
  ActiveTool,
  FillStyle,
  SketchElement,
} from "@repo/canvas-core/types";
import {  DEFAULT_DARK_STROKE, DEFAULT_LIGHT_STROKE } from "@repo/common";


export type DrawingToolbarStyle = {
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
};

export type TextToolbarStyle = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  textAlign?: "left" | "center" | "right";
  textVerticalAlign?: "top" | "middle" | "bottom";
};

export type ToolbarStyle = DrawingToolbarStyle & TextToolbarStyle;

export function getToolTransitionStyle({
  currentTool,
  nextTool,
  canvasMode,
}: {
  currentTool: ActiveTool;
  nextTool: ActiveTool;
  canvasMode: "light" | "dark";
}): DrawingToolbarStyle | null {
  if (nextTool === "highlighter") {
    return {
      strokeColor: "#f2d14f",
      fillColor: "none",
      fillStyle: "none",
      strokeWidth: 18,
    };
  }

  if (currentTool === "highlighter") {
    return {
      strokeColor:
        canvasMode === "dark" ? DEFAULT_DARK_STROKE : DEFAULT_LIGHT_STROKE,
      fillColor: "none",
      fillStyle: "none",
      strokeWidth: 1.5,
    };
  }

  return null;
}

export function getToolbarStyleFromElement(
  element: SketchElement,
): ToolbarStyle {
  return {
    strokeColor: element.strokeColor,
    fillColor: element.fillColor,
    fillStyle: element.fillStyle,
    strokeWidth: element.strokeWidth,
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
    textAlign: element.textAlign,
    textVerticalAlign: element.textVerticalAlign,
  };
}
