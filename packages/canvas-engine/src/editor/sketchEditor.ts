import { createStore, type StoreApi } from "zustand/vanilla";
import { createHistory, type HistoryState } from "@repo/element/history";
import type {
  ActiveTool,
  Point,
  SketchElement,
  Tool,
} from "@repo/element/types";
import { mergeElementsById, setSelection } from "@repo/element/selection";
import {
  createInitialAppState,
  type CanvasAppState,
  type CanvasTheme,
  type CurrentItemStyle,
} from "../appState";
import { createScene, updateSceneElements, type SketchScene } from "../scene";
import {
  getHistoryStatus,
  pushHistorySnapshot as pushSnapshotToHistory,
  redoHistory,
  undoHistory,
} from "../lib/historyModel";
import { applyActionResult, dispatchAction, performAction } from "../actions/manager";
import { actionUpdateStyle } from "../actions/style";
import {
  actionAddElement,
  actionReplaceScene,
  actionUpdateElements,
} from "../actions/elements";
import { actionSetActiveTool } from "../actions/tool";
import type { Action } from "../actions/types";
import { createNullSurface, type Surface } from "./surface";

export type SketchEditorOptions = {
  surface?: Surface;
  theme?: CanvasTheme;
  /** Seeds the recognition preferences; they are view state after that. */
  settings?: Partial<
    Pick<
      CanvasAppState,
      "scribbleEnabled" | "recognitionBackend" | "recognitionApiKey"
    >
  >;
  /** Called whenever a change should be persisted. */
  onChange?: () => void;
};

export type CommitElementOptions = {
  select?: boolean;
  nextTool?: ActiveTool;
};

/**
 * The canvas editor.
 *
 * Owns the scene, the history and the view state, and is the only thing that
 * writes any of them. Built without React so a test can drive it directly:
 *
 *   const editor = createSketchEditor();
 *   editor.setActiveTool("ellipse");
 *   expect(editor.getState().activeTool).toBe("ellipse");
 *
 * See `CanvasAppState` for the rule that decides whether a new field belongs in
 * the store (view state) or in a plain field here (frame state).
 */
export function createSketchEditor(options: SketchEditorOptions = {}) {
  const surface = options.surface ?? createNullSurface();
  const store: StoreApi<CanvasAppState> = createStore<CanvasAppState>()(() => ({
    ...createInitialAppState(options.theme ?? "light"),
    ...options.settings,
  }));

  // Frame state. Mutated in place, never observed by React.
  const frame = {
    elements: [] as SketchElement[],
    scene: createScene() as SketchScene,
    history: createHistory() as HistoryState,
  };

  function getState(): CanvasAppState {
    return store.getState();
  }

  function setAppState(updates: Partial<CanvasAppState>) {
    store.setState(updates);
  }

  function getElements(): SketchElement[] {
    return frame.elements;
  }

  function setSceneElements(nextElements: SketchElement[]) {
    frame.scene = updateSceneElements(frame.scene, nextElements);
    frame.elements = nextElements;
  }

  function publishHistoryStatus() {
    setAppState(getHistoryStatus(frame.history));
  }

  function captureHistory() {
    pushSnapshotToHistory(frame.history, [...frame.elements]);
    publishHistoryStatus();
    options.onChange?.();
  }

  /** The five-method surface `actions/manager` dispatches against. */
  const dispatcher = {
    getElements,
    setSceneElements,
    getAppState: getState,
    setAppState,
    captureHistory,
  };

  function pushHistorySnapshot(snapshot: SketchElement[] = frame.elements) {
    pushSnapshotToHistory(frame.history, snapshot);
    publishHistoryStatus();
    options.onChange?.();
  }

  function setSelectedElements(next: SketchElement[]) {
    setSceneElements(mergeElementsById(frame.elements, next));
    setAppState({ selectedElementIds: setSelection(next.map((el) => el.id)) });
  }

  function clearSelection() {
    setAppState({ selectedElementIds: new Set(), selectedTool: null });
  }

  /** Drops the selection without clearing the active tool's own state. */
  function commitSelectedElements() {
    if (getState().selectedElementIds.size === 0) return;
    setAppState({ selectedElementIds: new Set(), selectedTool: null });
  }

  function updateSelectedElements(updates: Partial<SketchElement>) {
    const result = performAction(
      actionUpdateStyle,
      { elements: frame.elements, appState: getState() },
      { appState: updates, elements: updates },
    );
    if (!result) return false;

    applyActionResult(dispatcher, result);
    return true;
  }

  function commitUpdatedElements(
    elements: SketchElement[],
    options: {
      selectedElementIds?: Iterable<string>;
      selectedTool?: Tool | null;
    } = {},
  ) {
    return dispatchAction(dispatcher, actionUpdateElements, {
      elements,
      selectedElementIds: options.selectedElementIds,
      selectedTool: options.selectedTool,
    });
  }

  function saveSelectedElementEdit(element: SketchElement) {
    return commitUpdatedElements([element], {
      selectedElementIds: [element.id],
      selectedTool: element.tool,
    });
  }

  function commitCreatedElement(
    element: SketchElement,
    commitOptions: CommitElementOptions = {},
  ) {
    const shouldSelect = commitOptions.select ?? true;
    return dispatchAction(dispatcher, actionAddElement, {
      element,
      select: shouldSelect,
      nextTool: commitOptions.nextTool ?? (shouldSelect ? "select" : undefined),
    });
  }

  function commitSceneElements(nextElements: SketchElement[]) {
    return dispatchAction(dispatcher, actionReplaceScene, {
      elements: nextElements,
    });
  }

  function setActiveTool(nextTool: ActiveTool) {
    if (getState().activeTool !== nextTool) {
      commitSelectedElements();
    }

    return dispatchAction(dispatcher, actionSetActiveTool, {
      tool: nextTool,
      canvasMode: getState().theme,
    });
  }

  /**
   * Applies a style change to the toolbar and, when something is selected, to
   * the selected elements too. This is what a style control does.
   */
  function setStyle(style: Partial<CurrentItemStyle>) {
    return updateSelectedElements(style as Partial<SketchElement>);
  }

  /**
   * Applies a style change to the toolbar only, leaving the selected elements
   * alone. Used when the toolbar is being synced *from* an element, where
   * writing back would be a no-op at best and a loop at worst.
   */
  function setToolbarStyle(style: Partial<CurrentItemStyle>) {
    const result = performAction(
      actionUpdateStyle,
      { elements: frame.elements, appState: getState() },
      { appState: style },
    );
    if (!result) return false;

    applyActionResult(dispatcher, result);
    return true;
  }

  function undo() {
    const { snapshot } = undoHistory(frame.history);
    publishHistoryStatus();
    if (!snapshot) return false;

    dispatchAction(dispatcher, actionReplaceScene, {
      elements: snapshot,
      captureUpdate: "none",
    });
    options.onChange?.();
    return true;
  }

  function redo() {
    const { snapshot } = redoHistory(frame.history);
    publishHistoryStatus();
    if (!snapshot) return false;

    dispatchAction(dispatcher, actionReplaceScene, {
      elements: snapshot,
      captureUpdate: "none",
    });
    options.onChange?.();
    return true;
  }

  return {
    surface,
    store,
    frame,
    getState,
    setAppState,

    /**
     * Runs an action against the editor. Internal to the engine: the tool
     * controllers use it, callers outside the package use the named methods.
     */
    dispatch<TPayload>(action: Action<TPayload>, payload: TPayload) {
      return dispatchAction(dispatcher, action, payload);
    },

    getElements,
    setSceneElements,
    setTheme: (theme: CanvasTheme) => setAppState({ theme }),
    setZoomDisplay: (zoomDisplay: number) => setAppState({ zoomDisplay }),
    setPanOffsetDisplay: (panOffsetDisplay: Point) =>
      setAppState({ panOffsetDisplay }),
    setIsBeautifying: (isBeautifying: boolean) => setAppState({ isBeautifying }),
    setScribblePending: (isScribblePending: boolean) =>
      setAppState({ isScribblePending }),
    setScribbleEnabled: (scribbleEnabled: boolean) =>
      setAppState({ scribbleEnabled }),
    setRecognitionBackend: (recognitionBackend: "tesseract" | "gemini") =>
      setAppState({ recognitionBackend }),
    setRecognitionApiKey: (recognitionApiKey: string) =>
      setAppState({ recognitionApiKey }),

    pushHistorySnapshot,
    publishHistoryStatus,
    setSelectedElements,
    clearSelection,
    commitSelectedElements,
    updateSelectedElements,
    commitUpdatedElements,
    saveSelectedElementEdit,
    commitCreatedElement,
    commitSceneElements,
    setActiveTool,
    setStyle,
    setToolbarStyle,
    undo,
    redo,
    notifyChange: () => options.onChange?.(),
  };
}

export type SketchEditor = ReturnType<typeof createSketchEditor>;
