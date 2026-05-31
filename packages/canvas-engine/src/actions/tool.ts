import type { ActiveTool } from "@repo/element/types";
import { getToolTransitionStyle } from "../lib/toolStyle";
import type { Action } from "./types";

export type SetActiveToolPayload = {
  tool: ActiveTool;
  canvasMode: "light" | "dark";
};

export const actionSetActiveTool: Action<SetActiveToolPayload> = {
  name: "setActiveTool",
  perform: ({ appState }, payload) => {
    const transitionStyle = getToolTransitionStyle({
      currentTool: appState.activeTool,
      nextTool: payload.tool,
      canvasMode: payload.canvasMode,
    });

    return {
      appState: {
        activeTool: payload.tool,
        ...(transitionStyle
          ? {
              currentItemStyle: {
                ...appState.currentItemStyle,
                ...transitionStyle,
              },
            }
          : {}),
      },
      captureUpdate: "none",
    };
  },
};
