import type { ActiveTool, FillStyle, Point, Tool } from "@repo/element/types";
import { DEFAULT_LIGHT_STROKE } from "@repo/common";

export type CanvasTheme = "light" | "dark";

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

/**
 * The editor's *view state*: everything React has to re-render for.
 *
 * State in this package is split by one rule, and this type is one side of it.
 *
 *   - View state (here) changes when the user does something. It lives in the
 *     editor's store, React subscribes to it, and the editor is its only writer.
 *   - Frame state (plain fields on the editor) changes up to once per animation
 *     frame while a pointer is down. React never sees it change.
 *
 * Add a field here only if JSX has to re-render when it changes. Zoom and pan
 * are the worked example: the live values are frame state, read during a render
 * pass, and only the throttled display copies below are view state.
 */
export type CanvasAppState = {
  activeTool: ActiveTool;
  selectedTool: Tool | null;
  selectedElementIds: ReadonlySet<string>;
  currentItemStyle: CurrentItemStyle;
  /** Zoom as a percentage, for the zoom indicator. */
  zoomDisplay: number;
  /** Last published pan offset, for the CSS background grid. */
  panOffsetDisplay: Point;
  theme: CanvasTheme;
  canUndo: boolean;
  canRedo: boolean;
  /** Whether the scene has any elements, for empty states and Beautify. */
  hasElements: boolean;
  /** Space is held: a drag pans instead of using the active tool. */
  panMode: boolean;
  isBeautifying: boolean;
  isScribblePending: boolean;
  /**
   * Recognition preferences. Seeded from the settings page, but view state
   * rather than config because the canvas UI renders and edits them.
   */
  scribbleEnabled: boolean;
  recognitionBackend: "tesseract" | "gemini";
  recognitionApiKey: string;
};

export function createInitialAppState(
  theme: CanvasTheme = "light",
): CanvasAppState {
  return {
    activeTool: "rectangle",
    selectedTool: null,
    selectedElementIds: new Set(),
    currentItemStyle: {
      strokeColor: DEFAULT_LIGHT_STROKE,
      fillColor: "none",
      fillStyle: "none",
      strokeWidth: 1.5,
      fontFamily: "Kalam, cursive",
      fontSize: 16,
      fontWeight: "normal",
      textAlign: "center",
      textVerticalAlign: "middle",
    },
    zoomDisplay: 100,
    panOffsetDisplay: { x: 0, y: 0 },
    theme,
    canUndo: false,
    canRedo: false,
    hasElements: false,
    panMode: false,
    isBeautifying: false,
    isScribblePending: false,
    scribbleEnabled: false,
    recognitionBackend: "tesseract",
    recognitionApiKey: "",
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
