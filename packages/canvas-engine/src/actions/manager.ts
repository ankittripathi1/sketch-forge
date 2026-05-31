import type { CanvasAppState } from "../appState";
import type { Action, ActionResult } from "./types";
import type { HistoryState } from "@repo/element/history";
import type { SketchElement } from "@repo/element/types";
import {
  pushHistorySnapshot,
  type HistoryStatus,
} from "../lib/historyModel";

export type DispatchActionContext = {
  elements: readonly SketchElement[];
  appState: CanvasAppState;
};

type Ref<T> = { current: T };

export type EditorActionContext = {
  elements: Ref<SketchElement[]>;
  history: Ref<HistoryState>;
  setSceneElements?: (elements: SketchElement[]) => void;
  getAppState: () => CanvasAppState;
  applyAppState: (updates: Partial<CanvasAppState>) => void;
  setHistoryStatus: (status: HistoryStatus) => void;
  onChange?: () => void;
};

export function performAction<TPayload>(
  action: Action<TPayload>,
  context: DispatchActionContext,
  payload: TPayload,
): ActionResult | false {
  return action.perform(context, payload);
}

export function applyActionResult(
  ctx: EditorActionContext,
  result: ActionResult,
) {
  if (result.elements) {
    const nextElements = [...result.elements];
    if (ctx.setSceneElements) {
      ctx.setSceneElements(nextElements);
    } else {
      ctx.elements.current = nextElements;
    }
  }

  if (result.appState) {
    ctx.applyAppState(result.appState);
  }

  if (
    result.captureUpdate === "history" ||
    result.captureUpdate === "immediately"
  ) {
    ctx.setHistoryStatus(
      pushHistorySnapshot(ctx.history.current, [...ctx.elements.current]),
    );
    ctx.onChange?.();
  }
}

export function dispatchAction<TPayload>(
  ctx: EditorActionContext,
  action: Action<TPayload>,
  payload: TPayload,
): ActionResult | false {
  const result = performAction(
    action,
    {
      elements: ctx.elements.current,
      appState: ctx.getAppState(),
    },
    payload,
  );

  if (result) {
    applyActionResult(ctx, result);
  }

  return result;
}
