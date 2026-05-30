import { createHistory, type HistoryState } from "@repo/canvas-core/history";
import type { Point, SketchElement } from "@repo/canvas-core/types";
import { deleteElementsByIds, duplicateElements } from "./selectionModel";
import {
  pushHistorySnapshot,
  redoHistory,
  undoHistory,
  type HistoryStatus,
} from "./historyModel";
import { buildImageElement } from "../tools/image";

type Ref<T> = { current: T };

export type CanvasCommandsContext = {
  elements: Ref<SketchElement[]>;
  selectedIds: Ref<Set<string>>;
  history: Ref<HistoryState>;
  screenToCanvas: (point: Point) => Point;
  selectedElementsList: () => SketchElement[];
  setSelectedElements: (next: SketchElement[]) => void;
  setHistoryStatus: (status: HistoryStatus) => void;
  clearSelection: () => void;
  renderScene: () => void;
  renderSceneAndSelection: () => void;
};

function recordHistory(
  ctx: CanvasCommandsContext,
  snapshot = ctx.elements.current,
) {
  ctx.setHistoryStatus(pushHistorySnapshot(ctx.history.current, snapshot));
}

export function undoCanvas(ctx: CanvasCommandsContext) {
  const { snapshot, status } = undoHistory(ctx.history.current);
  ctx.setHistoryStatus(status);
  if (!snapshot) return;

  ctx.elements.current = snapshot;
  ctx.clearSelection();
  ctx.renderSceneAndSelection();
}

export function redoCanvas(ctx: CanvasCommandsContext) {
  const { snapshot, status } = redoHistory(ctx.history.current);
  ctx.setHistoryStatus(status);
  if (!snapshot) return;

  ctx.elements.current = snapshot;
  ctx.clearSelection();
  ctx.renderSceneAndSelection();
}

export function deleteSelectedElements(ctx: CanvasCommandsContext) {
  if (ctx.selectedIds.current.size === 0) return;

  ctx.elements.current = deleteElementsByIds(
    ctx.elements.current,
    ctx.selectedIds.current,
  );
  ctx.clearSelection();
  recordHistory(ctx, [...ctx.elements.current]);
  ctx.renderSceneAndSelection();
}

export function duplicateSelectedElements(
  ctx: CanvasCommandsContext,
  offset: number,
) {
  const originals = ctx.selectedElementsList();
  if (originals.length === 0) return;

  const duplicates = duplicateElements(originals, offset);
  ctx.elements.current = [...ctx.elements.current, ...duplicates];
  ctx.setSelectedElements(duplicates);
  recordHistory(ctx, [...ctx.elements.current]);
  ctx.renderSceneAndSelection();
}

export function deselectCanvas(ctx: CanvasCommandsContext) {
  ctx.clearSelection();
  ctx.renderSceneAndSelection();
}

export function replaceCanvasElements(
  ctx: CanvasCommandsContext,
  newElements: SketchElement[],
) {
  ctx.elements.current = newElements;
  ctx.clearSelection();
  ctx.history.current = createHistory();
  recordHistory(ctx, newElements);
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
    ctx.elements.current = [...ctx.elements.current, element];
    recordHistory(ctx);
    ctx.renderScene();
  };
  reader.readAsDataURL(file);
}
