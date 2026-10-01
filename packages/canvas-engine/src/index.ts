export { useSketchEngine } from "./useSketchEngine";
export {
  createSketchEditor,
  type DeepReadonly,
  type PointerButtons,
  type ReadonlyAppState,
  type ReadonlyEditorStore,
  type ReadonlyElement,
  type RecognitionSettings,
  type SketchEditor,
  type SketchEditorOptions,
} from "./editor/sketchEditor";
export { createNullSurface, type Surface } from "./editor/surface";
export {
  CanvasEditorProvider,
  useEditorState,
  useSketchEditor,
} from "./react/editorContext";
export type {
  CanvasAppState,
  CanvasTheme,
  CurrentItemStyle,
} from "./appState";
export {
  defineEditorCommand,
  EditorCommandManager,
  type EditorCommand,
  type EditorCommandResult,
} from "./editor/commandManager";
