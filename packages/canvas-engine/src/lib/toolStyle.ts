import type { FillStyle, Tool } from "@repo/canvas-core/types";
import {
  DEFAULT_DARK_STROKE,
  DEFAULT_LIGHT_STROKE,
} from "@repo/canvas-core/colorUtils";

export type DrawingToolbarStyle = {
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
};

export function getToolTransitionStyle({
  currentTool,
  nextTool,
  canvasMode,
}: {
  currentTool: Tool;
  nextTool: Tool;
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
