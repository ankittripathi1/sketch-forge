import { createHistory, type HistoryState } from "@repo/element/history";
import type { Point, SketchElement } from "@repo/element/types";
import { redoHistory, undoHistory, type HistoryStatus } from "./historyModel";
import { buildImageElement } from "../tools/image";
import type { CanvasAppState } from "../appState";
import {
  actionDeleteSelected,
  actionDeselect,
  actionDuplicateSelected,
} from "../actions/selection";
import { dispatchAction } from "../actions/manager";
import {
  actionAddElement,
  actionInsertElements,
  actionReplaceScene,
} from "../actions/elements";
import { cloneElementsForPaste, getSelectedElements } from "@repo/element";

type Ref<T> = { current: T };

export type CanvasCommandsContext = {
  elements: Ref<SketchElement[]>;
  selectedIds: Ref<Set<string>>;
  history: Ref<HistoryState>;
  setSceneElements: (elements: SketchElement[]) => void;
  getAppState: () => CanvasAppState;
  applyAppState: (updates: Partial<CanvasAppState>) => void;
  onChange?: () => void;
  screenToCanvas: (point: Point) => Point;
  setHistoryStatus: (status: HistoryStatus) => void;
  clearSelection: () => void;
  renderScene: () => void;
  renderSceneAndSelection: () => void;
};

export function undoCanvas(ctx: CanvasCommandsContext) {
  const { snapshot, status } = undoHistory(ctx.history.current);
  ctx.setHistoryStatus(status);
  if (!snapshot) return;

  dispatchAction(ctx, actionReplaceScene, {
    elements: snapshot,
    captureUpdate: "none",
  });
  ctx.onChange?.();
  ctx.renderSceneAndSelection();
}

export function redoCanvas(ctx: CanvasCommandsContext) {
  const { snapshot, status } = redoHistory(ctx.history.current);
  ctx.setHistoryStatus(status);
  if (!snapshot) return;

  dispatchAction(ctx, actionReplaceScene, {
    elements: snapshot,
    captureUpdate: "none",
  });
  ctx.onChange?.();
  ctx.renderSceneAndSelection();
}

export function deleteSelectedElements(ctx: CanvasCommandsContext) {
  const result = dispatchAction(ctx, actionDeleteSelected, undefined);
  if (!result) return;

  ctx.renderSceneAndSelection();
}

export function duplicateSelectedElements(
  ctx: CanvasCommandsContext,
  offset: number,
) {
  const result = dispatchAction(ctx, actionDuplicateSelected, { offset });
  if (!result) return;

  ctx.renderSceneAndSelection();
}

export function deselectCanvas(ctx: CanvasCommandsContext) {
  const result = dispatchAction(ctx, actionDeselect, undefined);
  if (!result) return;

  ctx.renderSceneAndSelection();
}

export function replaceCanvasElements(
  ctx: CanvasCommandsContext,
  newElements: SketchElement[],
) {
  ctx.history.current = createHistory();
  dispatchAction(ctx, actionReplaceScene, {
    elements: newElements,
  });
  ctx.renderSceneAndSelection();
}

export function handleImageDrop(
  ctx: CanvasCommandsContext,
  event: DragEvent,
  point: Point,
) {
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  const file = files[0]!;
  if (!file.type.startsWith("image/")) return;

  const canvasPoint = ctx.screenToCanvas(point);
  const reader = new FileReader();
  reader.onload = () => {
    const element = buildImageElement(canvasPoint, reader.result as string);
    dispatchAction(ctx, actionAddElement, {
      element,
      select: false,
    });
    ctx.renderScene();
  };
  reader.readAsDataURL(file);
}

export function getSelectedCanvasElements(
  ctx: CanvasCommandsContext,
): SketchElement[] {
  return getSelectedElements(ctx.elements.current, ctx.selectedIds.current);
}

export function pasteCanvasElements(
  ctx: CanvasCommandsContext,
  sourceElements: SketchElement[],
  offset: Point,
): boolean {
  if (sourceElements.length === 0) {
    return false;
  }
  const pastedElements = cloneElementsForPaste(sourceElements, offset);

  const result = dispatchAction(ctx, actionInsertElements, {
    elements: pastedElements,
  });

  if (!result) return false;

  ctx.renderSceneAndSelection();
  return true;
}
