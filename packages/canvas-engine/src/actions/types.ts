import type { SketchElement } from "@repo/element/types";
import type { CanvasAppState } from "../appState";

export type CaptureUpdate = "none" | "history" | "immediately";

export type ActionResult = {
  elements?: readonly SketchElement[];
  appState?: Partial<CanvasAppState>;
  captureUpdate: CaptureUpdate;
};

export type ActionContext = {
  elements: readonly SketchElement[];
  appState: CanvasAppState;
};

export type ActionHandler<TPayload = unknown> = (
  context: ActionContext,
  payload: TPayload,
) => ActionResult | false;

export type Action<TPayload = undefined> = {
  name: string;
  perform: ActionHandler<TPayload>;
};
