export { SketchCanvas } from "./components/SketchCanvas";
export { Toolbar } from "./components/Toolbar";
export { CanvasActions } from "./components/CanvasActions";
export { BackgroundPicker } from "./components/BackgroundPicker";
export { StylePanel } from "./components/StylePanel";
export { SettingsPanel } from "./components/SettingsPanel";
export { NotebookSidebar } from "./components/NotebookSidebar";

export { useCanvasSync } from "./hooks/useCanvasSync";
export { useCanvasPreferences } from "./hooks/useCanvasPreferences";
export { useCanvasShortcuts } from "./hooks/useCanvasShortcuts";
export { useNotebookData } from "./hooks/useNotebookData";

export {
  CANVAS_THEME_DEFAULTS,
  getCanvasPrefsKey,
} from "./config/canvasPreferences";
export { getBackgroundStyle } from "./utils/backgroundStyle";

export type { CanvasBackground, CanvasMode } from "./types";
