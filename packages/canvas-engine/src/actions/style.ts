import { updateElementsByIds } from "@repo/element/selection";
import type { SketchElement } from "@repo/element/types";
import type { CurrentItemStyle } from "../appState";
import type { Action } from "./types";

type ElementStyleUpdates = Partial<
  Pick<
    SketchElement,
    | "strokeColor"
    | "fillColor"
    | "fillStyle"
    | "strokeWidth"
    | "fontFamily"
    | "fontSize"
    | "fontWeight"
    | "textAlign"
    | "textVerticalAlign"
  >
>;

export type UpdateStylePayload = {
  appState: Partial<CurrentItemStyle>;
  elements?: ElementStyleUpdates;
};

export const actionUpdateStyle: Action<UpdateStylePayload> = {
  name: "updateStyle",
  perform: ({ elements, appState }, payload) => {
    const nextAppState = {
      currentItemStyle: {
        ...appState.currentItemStyle,
        ...payload.appState,
      },
    };

    if (!payload.elements || appState.selectedElementIds.size === 0) {
      return {
        appState: nextAppState,
        captureUpdate: "none",
      };
    }

    return {
      elements: updateElementsByIds(
        [...elements],
        new Set(appState.selectedElementIds),
        payload.elements,
      ),
      appState: nextAppState,
      captureUpdate: "history",
    };
  },
};
