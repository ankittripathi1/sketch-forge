import {
  deleteElementsByIds,
  duplicateElements,
  getSelectedElements,
} from "@repo/element/selection";
import type { Action } from "./types";

export const actionDeleteSelected: Action = {
  name: "deleteSelected",
  perform: ({ elements, appState }) => {
    if (appState.selectedElementIds.size === 0) return false;

    return {
      elements: deleteElementsByIds(
        [...elements],
        new Set(appState.selectedElementIds),
      ),
      appState: {
        selectedElementIds: new Set(),
        selectedTool: null,
      },
      captureUpdate: "history",
    };
  },
};

export const actionDuplicateSelected: Action<{ offset: number }> = {
  name: "duplicateSelected",
  perform: ({ elements, appState }, { offset }) => {
    const originals = getSelectedElements(
      [...elements],
      new Set(appState.selectedElementIds),
    );
    if (originals.length === 0) return false;

    const duplicates = duplicateElements(originals, offset);

    return {
      elements: [...elements, ...duplicates],
      appState: {
        selectedElementIds: new Set(duplicates.map((element) => element.id)),
      },
      captureUpdate: "history",
    };
  },
};

export const actionDeselect: Action = {
  name: "deselect",
  perform: ({ appState }) => {
    if (appState.selectedElementIds.size === 0 && !appState.selectedTool) {
      return false;
    }

    return {
      appState: {
        selectedElementIds: new Set(),
        selectedTool: null,
      },
      captureUpdate: "none",
    };
  },
};
