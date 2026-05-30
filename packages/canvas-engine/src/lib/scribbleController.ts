import type { SketchElement } from "@repo/canvas-core/types";
import {
  debounceForBackend,
  recognizeHandwriting,
  type RecognitionConfig,
} from "@repo/canvas-core/lib/recognition";
import { buildTextFromStrokes } from "./scribble";

type Ref<T> = { current: T };

export type ScribbleControllerContext = {
  pendingScribbleIds: Ref<string[]>;
  scribbleTimer: Ref<ReturnType<typeof setTimeout> | null>;
  recognitionConfig: Ref<RecognitionConfig>;
  elements: Ref<SketchElement[]>;
  strokeColor: string;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  setScribblePending: (pending: boolean) => void;
  pushHistorySnapshot: (snapshot?: SketchElement[]) => void;
  renderScene: () => void;
};

export function queueScribbleStroke(
  ctx: ScribbleControllerContext,
  id: string,
) {
  ctx.pendingScribbleIds.current.push(id);
  ctx.setScribblePending(true);
  if (ctx.scribbleTimer.current) clearTimeout(ctx.scribbleTimer.current);

  const debounceMs = debounceForBackend(ctx.recognitionConfig.current.backend);
  ctx.scribbleTimer.current = setTimeout(() => {
    void flushScribbleBatch(ctx);
  }, debounceMs);
}

export async function flushScribbleBatch(ctx: ScribbleControllerContext) {
  const ids = new Set(ctx.pendingScribbleIds.current);
  ctx.pendingScribbleIds.current = [];

  if (!ids.size) {
    ctx.setScribblePending(false);
    return;
  }

  try {
    const strokeEls = ctx.elements.current.filter(
      (el) => el.tool === "freehand" && ids.has(el.id),
    );
    if (!strokeEls.length) return;

    const strokes = strokeEls
      .map((el) => el.points ?? [])
      .filter((pts) => pts.length >= 3);

    if (!strokes.length) return;

    const text = await recognizeHandwriting(
      strokes,
      ctx.recognitionConfig.current,
    );

    const textEl = buildTextFromStrokes(strokes, text, {
      strokeColor: ctx.strokeColor,
      fontFamily: ctx.fontFamily,
      fontWeight: ctx.fontWeight,
    });
    if (!textEl) return;

    ctx.elements.current = ctx.elements.current.filter((el) => !ids.has(el.id));
    ctx.elements.current = [...ctx.elements.current, textEl];
    ctx.pushHistorySnapshot();
    ctx.renderScene();
  } finally {
    ctx.setScribblePending(false);
  }
}
