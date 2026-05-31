import { mergeElementsById } from "@repo/element/selection";
import type { ActiveTool, SketchElement, Tool } from "@repo/element/types";
import type { CaptureUpdate, Action } from "./types";

export type AddElementPayload = {
  element: SketchElement;
  select?: boolean;
  nextTool?: ActiveTool;
  captureUpdate?: CaptureUpdate;
};

export const actionAddElement: Action<AddElementPayload> = {
  name: "addElement",
  perform: ({ elements }, payload) => {
    const select = payload.select ?? true;

    return {
      elements: [...elements, payload.element],
      appState: select
        ? {
            selectedElementIds: new Set([payload.element.id]),
            selectedTool: payload.element.tool,
            ...(payload.nextTool ? { activeTool: payload.nextTool } : {}),
          }
        : payload.nextTool
          ? { activeTool: payload.nextTool }
          : undefined,
      captureUpdate: payload.captureUpdate ?? "history",
    };
  },
};

export type UpdateElementsPayload = {
  elements: SketchElement[];
  selectedElementIds?: Iterable<string>;
  selectedTool?: Tool | null;
  captureUpdate?: CaptureUpdate;
};

export const actionUpdateElements: Action<UpdateElementsPayload> = {
  name: "updateElements",
  perform: ({ elements }, payload) => {
    return {
      elements: mergeElementsById([...elements], payload.elements),
      appState: {
        ...(payload.selectedElementIds
          ? { selectedElementIds: new Set(payload.selectedElementIds) }
          : {}),
        ...(payload.selectedTool !== undefined
          ? { selectedTool: payload.selectedTool }
          : {}),
      },
      captureUpdate: payload.captureUpdate ?? "history",
    };
  },
};

export type ReplaceScenePayload = {
  elements: SketchElement[];
  captureUpdate?: CaptureUpdate;
};

export const actionReplaceScene: Action<ReplaceScenePayload> = {
  name: "replaceScene",
  perform: (_context, payload) => ({
    elements: payload.elements,
    appState: {
      selectedElementIds: new Set(),
      selectedTool: null,
    },
    captureUpdate: payload.captureUpdate ?? "history",
  }),
};
