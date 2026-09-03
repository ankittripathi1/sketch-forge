import type { CanvasAppState } from "../appState";
import type { Action, ActionResult } from "./types";
import type { SketchElement } from "@repo/element/types";

export type DispatchActionContext = {
  elements: readonly SketchElement[];
  appState: CanvasAppState;
};

/**
 * What an action needs to be applied to. The editor satisfies this; a test can
 * satisfy it with five closures.
 *
 * This replaced a context that fanned each action result back out to a zustand
 * store, seven `useState` setters and six refs. Because view state now has one
 * owner, applying a result is a single `setAppState` call.
 */
export type ActionDispatcher = {
  getElements: () => SketchElement[];
  setSceneElements: (elements: SketchElement[]) => void;
  getAppState: () => CanvasAppState;
  setAppState: (updates: Partial<CanvasAppState>) => void;
  /** Pushes the current elements onto the history stack. */
  captureHistory: () => void;
};

export function performAction<TPayload>(
  action: Action<TPayload>,
  context: DispatchActionContext,
  payload: TPayload,
): ActionResult | false {
  return action.perform(context, payload);
}

export function applyActionResult(ctx: ActionDispatcher, result: ActionResult) {
  if (result.elements) {
    ctx.setSceneElements([...result.elements]);
  }

  if (result.appState) {
    ctx.setAppState(result.appState);
  }

  if (
    result.captureUpdate === "history" ||
    result.captureUpdate === "immediately"
  ) {
    ctx.captureHistory();
  }
}

export function dispatchAction<TPayload>(
  ctx: ActionDispatcher,
  action: Action<TPayload>,
  payload: TPayload,
): ActionResult | false {
  const result = performAction(
    action,
    {
      elements: ctx.getElements(),
      appState: ctx.getAppState(),
    },
    payload,
  );

  if (result) {
    applyActionResult(ctx, result);
  }

  return result;
}
