import type { HistoryState } from "@repo/canvas-core/history";
import type { SketchElement } from "@repo/canvas-core/types";

export type HistoryStatus = {
  canUndo: boolean;
  canRedo: boolean;
};

export function getHistoryStatus(history: HistoryState): HistoryStatus {
  return {
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  };
}

export function pushHistorySnapshot(
  history: HistoryState,
  snapshot: SketchElement[],
): HistoryStatus {
  history.push(snapshot);
  return getHistoryStatus(history);
}

export function undoHistory(history: HistoryState): {
  snapshot: SketchElement[] | null;
  status: HistoryStatus;
} {
  const snapshot = history.undo();
  return {
    snapshot,
    status: getHistoryStatus(history),
  };
}

export function redoHistory(history: HistoryState): {
  snapshot: SketchElement[] | null;
  status: HistoryStatus;
} {
  const snapshot = history.redo();
  return {
    snapshot,
    status: getHistoryStatus(history),
  };
}
