import type { HistoryState } from "@repo/element/history";
import type {
  ActiveTool,
  FillStyle,
  Point,
  SketchElement,
  Tool,
} from "@repo/element/types";
import { mergeElementsById, setSelection } from "@repo/element/selection";
import type { HistoryStatus } from "../lib/historyModel";
import { pushHistorySnapshot as pushSnapshotToHistory } from "../lib/historyModel";
import type { CanvasAppState, CurrentItemStyle } from "../appState";
import type { SketchScene } from "../scene";
import { updateSceneElements } from "../scene";
import { dispatchAction, performAction, applyActionResult } from "../actions/manager";
import { actionUpdateStyle } from "../actions/style";
import {
  actionAddElement,
  actionReplaceScene,
  actionUpdateElements,
} from "../actions/elements";
import { actionSetActiveTool } from "../actions/tool";

type Ref<T> = { current: T };

export type EditorControllerContext = {
  elements: Ref<SketchElement[]>;
  scene: Ref<SketchScene>;
  history: Ref<HistoryState>;
  selectedIds: Ref<Set<string>>;
  activeTool: ActiveTool;
  selectedTool: Tool | null;
  zoom: Ref<number>;
  zoomLevel: number;
  panOffset: Ref<Point>;
  canvasMode: "light" | "dark";
  isPanning: Ref<boolean>;
  isBeautifying: boolean;
  scribblePending: boolean;
  currentItemStyle: CurrentItemStyle;
  setActiveTool: (tool: ActiveTool) => void;
  setSelectedTool: (tool: Tool | null) => void;
  setHistoryStatus: (status: HistoryStatus) => void;
  setCurrentItemStyle: (style: CurrentItemStyle) => void;
  setZoomLevel: (zoom: number) => void;
  setPanOffsetDisplay: (point: Point) => void;
  setIsBeautifying: (value: boolean) => void;
  setScribblePending: (value: boolean) => void;
  onChange?: () => void;
};

export type CommitElementOptions = {
  select?: boolean;
  nextTool?: ActiveTool;
};

export function createEditorController(ctx: EditorControllerContext) {
  function setSceneElements(nextElements: SketchElement[]) {
    ctx.scene.current = updateSceneElements(ctx.scene.current, nextElements);
    ctx.elements.current = nextElements;
  }

  function getAppState(): CanvasAppState {
    return {
      activeTool: ctx.activeTool,
      selectedTool: ctx.selectedTool,
      selectedElementIds: ctx.selectedIds.current,
      currentItemStyle: ctx.currentItemStyle,
      zoom: {
        value: ctx.zoom.current,
        display: ctx.zoomLevel,
      },
      scroll: ctx.panOffset.current,
      theme: ctx.canvasMode,
      isPanning: ctx.isPanning.current,
      isBeautifying: ctx.isBeautifying,
      isScribblePending: ctx.scribblePending,
    };
  }

  function applyAppState(updates: Partial<CanvasAppState>) {
    if (updates.activeTool !== undefined) {
      ctx.setActiveTool(updates.activeTool);
    }
    if (updates.selectedTool !== undefined) {
      ctx.setSelectedTool(updates.selectedTool);
    }
    if (updates.selectedElementIds !== undefined) {
      ctx.selectedIds.current = new Set(updates.selectedElementIds);
    }
    if (updates.currentItemStyle !== undefined) {
      ctx.setCurrentItemStyle(updates.currentItemStyle);
    }
    if (updates.zoom !== undefined) {
      ctx.zoom.current = updates.zoom.value;
      ctx.setZoomLevel(updates.zoom.display);
    }
    if (updates.scroll !== undefined) {
      ctx.panOffset.current = updates.scroll;
      ctx.setPanOffsetDisplay(updates.scroll);
    }
    if (updates.isPanning !== undefined) {
      ctx.isPanning.current = updates.isPanning;
    }
    if (updates.isBeautifying !== undefined) {
      ctx.setIsBeautifying(updates.isBeautifying);
    }
    if (updates.isScribblePending !== undefined) {
      ctx.setScribblePending(updates.isScribblePending);
    }
  }

  const actionContext = {
    elements: ctx.elements,
    history: ctx.history,
    setSceneElements,
    getAppState,
    applyAppState,
    setHistoryStatus: ctx.setHistoryStatus,
    onChange: ctx.onChange,
  };

  function pushHistorySnapshot(snapshot = ctx.elements.current) {
    ctx.setHistoryStatus(pushSnapshotToHistory(ctx.history.current, snapshot));
    ctx.onChange?.();
  }

  function setSelectedElements(next: SketchElement[]) {
    setSceneElements(mergeElementsById(ctx.elements.current, next));
    ctx.selectedIds.current = setSelection(next.map((el) => el.id));
  }

  function clearSelection() {
    ctx.selectedIds.current = new Set();
    ctx.setSelectedTool(null);
  }

  function commitSelectedElements() {
    if (ctx.selectedIds.current.size === 0) return;
    ctx.selectedIds.current = new Set();
    ctx.setSelectedTool(null);
  }

  function updateSelectedElements(updates: Partial<SketchElement>) {
    const result = performAction(
      actionUpdateStyle,
      {
        elements: ctx.elements.current,
        appState: getAppState(),
      },
      {
        appState: updates,
        elements: updates,
      },
    );
    if (!result) return false;

    applyActionResult(actionContext, result);
    return true;
  }

  function saveSelectedElementEdit(element: SketchElement) {
    return commitUpdatedElements([element], {
      selectedElementIds: [element.id],
      selectedTool: element.tool,
    });
  }

  function commitUpdatedElements(
    elements: SketchElement[],
    options: {
      selectedElementIds?: Iterable<string>;
      selectedTool?: Tool | null;
    } = {},
  ) {
    return dispatchAction(actionContext, actionUpdateElements, {
      elements,
      selectedElementIds: options.selectedElementIds,
      selectedTool: options.selectedTool,
    });
  }

  function commitCreatedElement(
    element: SketchElement,
    options: CommitElementOptions = {},
  ) {
    const shouldSelect = options.select ?? true;
    return dispatchAction(actionContext, actionAddElement, {
      element,
      select: shouldSelect,
      nextTool: options.nextTool ?? (shouldSelect ? "select" : undefined),
    });
  }

  function commitSceneElements(nextElements: SketchElement[]) {
    return dispatchAction(actionContext, actionReplaceScene, {
      elements: nextElements,
    });
  }

  function applyActiveTool(nextTool: ActiveTool) {
    if (ctx.activeTool !== nextTool) {
      commitSelectedElements();
    }

    return dispatchAction(actionContext, actionSetActiveTool, {
      tool: nextTool,
      canvasMode: ctx.canvasMode,
    });
  }

  return {
    setSceneElements,
    getAppState,
    applyAppState,
    pushHistorySnapshot,
    setSelectedElements,
    clearSelection,
    commitSelectedElements,
    updateSelectedElements,
    commitUpdatedElements,
    saveSelectedElementEdit,
    commitCreatedElement,
    commitSceneElements,
    applyActiveTool,
  };
}
