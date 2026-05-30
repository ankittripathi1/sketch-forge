import { SketchElement } from "./types";

export type HistoryState = {
  push: (snapshot: SketchElement[]) => void;
  undo: () => SketchElement[] | null;
  redo: () => SketchElement[] | null;
  getCurrent: () => SketchElement[];
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export function createHistory(): HistoryState {
  const snapshots: SketchElement[][] = [[]];
  let pointer = 0;

  return {
    push(snapshot) {
      snapshots.splice(pointer + 1);
      snapshots.push([...snapshot]);
      pointer = snapshots.length - 1;
    },
    undo() {
      if (pointer <= 0) return null;
      pointer--;
      return [...(snapshots[pointer] ?? [])];
    },
    redo() {
      if (pointer >= snapshots.length - 1) return null;
      pointer++;
      return [...(snapshots[pointer] ?? [])];
    },
    getCurrent() {
      return [...(snapshots[pointer] ?? [])];
    },
    canUndo() {
      return pointer > 0;
    },
    canRedo() {
      return pointer < snapshots.length - 1;
    },
  };
}
