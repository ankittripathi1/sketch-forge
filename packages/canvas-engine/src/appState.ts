import type { ActiveTool, FillStyle, Point, Tool } from "@repo/element/types";

export type CanvasTheme = "light" | "dark";

export type ZoomState = {
  value: number;
  display: number;
};

export type CurrentItemStyle = {
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  textAlign: "left" | "center" | "right";
  textVerticalAlign: "top" | "middle" | "bottom";
};

export type CanvasAppState = {
  activeTool: ActiveTool;
  selectedTool: Tool | null;
  selectedElementIds: ReadonlySet<string>;
  currentItemStyle: CurrentItemStyle;
  zoom: ZoomState;
  scroll: Point;
  theme: CanvasTheme;
  isPanning: boolean;
  isBeautifying: boolean;
  isScribblePending: boolean;
};

export function createInitialAppState(
  theme: CanvasTheme = "light",
): CanvasAppState {
  return {
    activeTool: "rectangle",
    selectedTool: null,
    selectedElementIds: new Set(),
    currentItemStyle: {
      strokeColor: "#1a1a2e",
      fillColor: "none",
      fillStyle: "none",
      strokeWidth: 1.5,
      fontFamily: "Kalam, cursive",
      fontSize: 16,
      fontWeight: "normal",
      textAlign: "center",
      textVerticalAlign: "middle",
    },
    zoom: {
      value: 1,
      display: 100,
    },
    scroll: {
      x: 0,
      y: 0,
    },
    theme,
    isPanning: false,
    isBeautifying: false,
    isScribblePending: false,
  };
}

export function updateAppState(
  appState: CanvasAppState,
  updates: Partial<CanvasAppState>,
): CanvasAppState {
  return {
    ...appState,
    ...updates,
  };
}
