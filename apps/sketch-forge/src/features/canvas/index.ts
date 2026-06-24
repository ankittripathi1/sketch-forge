export { SketchCanvas } from "./components/SketchCanvas";
export { Toolbar } from "./components/Toolbar";
export { CanvasActions } from "./components/CanvasActions";
export { BackgroundPicker } from "./components/BackgroundPicker";
export { StylePanel } from "./components/StylePanel";
export { SettingsPanel } from "./components/SettingsPanel";
export { KeyboardShortcutSettings } from "./components/KeyboardShortcutSettings";
export { NotebookSidebar } from "./components/NotebookSidebar";

export { useCanvasSync } from "./hooks/useCanvasSync";
export { useCanvasPreferences } from "./hooks/useCanvasPreferences";
export { useNotebookData } from "./hooks/useNotebookData";
export { useCanvasEditorRuntime } from "./hooks/useCanvasEditorRuntime";
export { useCanvasShortcutRegistry } from "./hooks/useCanvasShortcutRegistry";

export {
  commandRedo,
  commandSetTool,
  commandUndo,
} from "./runtime/editorCommands";

export {
  CANVAS_THEME_DEFAULTS,
  getCanvasPrefsKey,
} from "./config/canvasPreferences";
export { getBackgroundStyle } from "./utils/backgroundStyle";
export { isEditableTarget } from "./utils/isEditableTarget";

export type { CanvasBackground, CanvasMode } from "./types";
export type { CanvasShortcutSettings } from "./hooks/useCanvasShortcutRegistry";
