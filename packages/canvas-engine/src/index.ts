export { useSketchEngine } from "./useSketchEngine";
export {
  createSketchEditor,
  type SketchEditor,
  type SketchEditorOptions,
} from "./editor/sketchEditor";
export { createNullSurface, type Surface } from "./editor/surface";
export {
  CanvasEditorProvider,
  useEditorState,
  useSketchEditor,
} from "./react/editorContext";
export {
  createInitialAppState,
  updateAppState,
  type CanvasAppState,
  type CanvasTheme,
  type CurrentItemStyle,
} from "./appState";
export {
  cloneSceneElements,
  createScene,
  getSceneElements,
  updateSceneElements,
  type SketchScene,
} from "./scene";
export type {
  Action,
  ActionContext,
  ActionHandler,
  ActionResult,
  CaptureUpdate,
} from "./actions/types";
export {
  actionDeleteSelected,
  actionDeselect,
  actionDuplicateSelected,
} from "./actions/selection";
export { actionUpdateStyle, type UpdateStylePayload } from "./actions/style";
export {
  actionAddElement,
  actionReplaceScene,
  actionUpdateElements,
  actionInsertElements,
  type AddElementPayload,
  type InsertElementsPayload,
  type ReplaceScenePayload,
  type UpdateElementsPayload,
} from "./actions/elements";
export { actionSetActiveTool, type SetActiveToolPayload } from "./actions/tool";
export {
  performAction,
  type ActionDispatcher,
  type DispatchActionContext,
} from "./actions/manager";
export {
  defineEditorCommand,
  EditorCommandManager,
  type EditorCommand,
  type EditorCommandResult,
} from "./editor/commandManager";
export {
  getContextualPasteTranslation,
  type CanvasViewportBounds,
  type PastePlacementContext,
} from "./lib/pastePlacement";
