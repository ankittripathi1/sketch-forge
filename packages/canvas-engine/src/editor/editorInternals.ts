import { createStore, type StoreApi } from "zustand/vanilla";
import type {
  ActiveTool,
  Point,
  SketchElement,
  Tool,
} from "@repo/element/types";
import {
  getSelectedElements,
  mergeElementsById,
  setSelection,
} from "@repo/element/selection";
import * as geometry from "@repo/element/transform";
import type { AnchorSide } from "@repo/element/types";
import type { BindableShape } from "../tools/interactions";
import {
  createInitialAppState,
  type CanvasAppState,
  type CanvasTheme,
  type CurrentItemStyle,
} from "../appState";
import { updateSceneElements } from "../scene";
import { createFrameState, type CanvasFrameState } from "./frameState";
import { createRenderers } from "../lib/rendering";
import {
  screenToCanvas as screenToCanvasMath,
  canvasToScreen as canvasToScreenMath,
} from "@repo/math";
import type { CanvasViewportBounds } from "../lib/pastePlacement";
import {
  getHistoryStatus,
  pushHistorySnapshot as pushSnapshotToHistory,
  redoHistory,
  undoHistory,
} from "../lib/historyModel";
import {
  applyActionResult,
  dispatchAction,
  performAction,
} from "../actions/manager";
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
 * The editor's internals: the state and the low-level writes the tool
 * controllers build on.
 *
 * Owns the scene, the history and the view state. Only code inside this
 * package sees this object. Callers get the public `SketchEditor` from
 * `createSketchEditor`, which wraps it.
 *
 * See `CanvasAppState` for the rule that decides whether a new field belongs in
 * the store (view state) or in a plain field here (frame state).
 */
export function createEditorInternals(options: SketchEditorOptions = {}) {
  const surface = options.surface ?? createNullSurface();
  const store: StoreApi<CanvasAppState> = createStore<CanvasAppState>()(() => ({
    ...createInitialAppState(options.theme ?? "light"),
    ...options.settings,
  }));

  // Frame state. Mutated in place, never observed by React.
  const frame: CanvasFrameState = createFrameState();

  function screenToCanvas(point: Point): Point {
    return screenToCanvasMath(point, frame.zoom, frame.panOffset);
  }

  function canvasToScreen(point: Point): Point {
    return canvasToScreenMath(point, frame.zoom, frame.panOffset);
  }

  /** The visible canvas-space rectangle, or null before the canvas attaches. */
  function getViewportBounds(): CanvasViewportBounds | null {
    const canvas = surface.interaction();
    if (!canvas) return null;

    const { width, height } = canvas.getBoundingClientRect();
    const topLeft = screenToCanvas({ x: 0, y: 0 });
    const bottomRight = screenToCanvas({ x: width, y: height });

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  /** Where the pointer is in canvas space, or null if it has left the canvas. */
  function getPointerPosition(): Point | null {
    return frame.pointerScreenPosition
      ? screenToCanvas(frame.pointerScreenPosition)
      : null;
  }

  const renderers = createRenderers({
    surface,
    frame,
    selectedIds: () => store.getState().selectedElementIds,
    setPanOffsetDisplay: (panOffsetDisplay) =>
      store.setState({ panOffsetDisplay }),
  });

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
    // Called up to once per frame during a drag, so only publish a change.
    const hasElements = nextElements.length > 0;
    if (store.getState().hasElements !== hasElements) {
      store.setState({ hasElements });
    }
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

  function selectedElementsList(): SketchElement[] {
    return getSelectedElements(
      frame.elements,
      new Set(getState().selectedElementIds),
    );
  }

  function normalizeElement(element: SketchElement): SketchElement {
    return geometry.normalizeElement(element);
  }

  /** Resizes an element by one handle, re-measuring text so labels still fit. */
  function applyResize(
    element: SketchElement,
    handle: number,
    to: Point,
  ): SketchElement {
    const style = getState().currentItemStyle;
    return geometry.applyResizeWithTextMeasurement({
      element,
      handle,
      to,
      allElements: [...frame.elements],
      zoom: frame.zoom,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
    });
  }

  function findBindableShape(
    point: Point,
    exclude: Set<string> = new Set(),
  ): BindableShape | null {
    return geometry.findBindableShape(
      point,
      [...frame.elements],
      frame.zoom,
      exclude,
    );
  }

  /** Re-points any arrows bound to the given shapes after those shapes moved. */
  function syncBoundArrows(shapeIds: Set<string>, list: SketchElement[]) {
    return geometry.syncBoundArrows(shapeIds, list, [...frame.elements]);
  }

  /**
   * Commits the current selection as a history entry, normalising each element
   * first so a shape dragged right-to-left is stored left-to-right.
   */
  function commitSelectedElementSnapshot({ render = false } = {}) {
    const normalized = selectedElementsList().map(normalizeElement);
    commitUpdatedElements(normalized, {
      selectedElementIds: normalized.map((element) => element.id),
    });
    if (render) renderers.renderSelection();
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
    ...renderers,
    screenToCanvas,
    canvasToScreen,
    getViewportBounds,
    getPointerPosition,
    clearPointerPosition() {
      frame.pointerScreenPosition = null;
    },

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
    setIsBeautifying: (isBeautifying: boolean) =>
      setAppState({ isBeautifying }),
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
    setSelectedTool: (selectedTool: Tool | null) =>
      setAppState({ selectedTool }),
    selectedElementsList,
    normalizeElement,
    applyResize,
    findBindableShape,
    syncBoundArrows,
    commitSelectedElementSnapshot,
    undo,
    redo,
    notifyChange: () => options.onChange?.(),
  };
}

export type EditorInternals = ReturnType<typeof createEditorInternals>;
