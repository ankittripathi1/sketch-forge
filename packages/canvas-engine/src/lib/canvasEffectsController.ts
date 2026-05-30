import type { SketchElement } from "@repo/canvas-core/types";
import type { RecognitionConfig } from "@repo/canvas-core/lib/recognition";
import { getAILayout } from "@repo/canvas-core/lib/layoutAI";
import { applyLayoutUpdates } from "./beautify";
import { recolorByTheme } from "./theme";

type Ref<T> = { current: T };

export type CanvasEffectsContext = {
  elements: Ref<SketchElement[]>;
  recognitionConfig: Ref<RecognitionConfig>;
  selectedElementsList: () => SketchElement[];
  setStrokeColor: (color: string) => void;
  setIsBeautifying: (isBeautifying: boolean) => void;
  syncBoundArrows: (
    shapeIds: Set<string>,
    elements: SketchElement[],
  ) => SketchElement[];
  pushHistorySnapshot: (snapshot?: SketchElement[]) => void;
  renderSceneAndSelection: () => void;
};

export async function beautifyLayout(ctx: CanvasEffectsContext) {
  const apiKey = ctx.recognitionConfig.current.apiKey?.trim();
  if (!apiKey) {
    throw new Error("A Gemini API key is required. Add it in Settings.");
  }

  const allElements = [...ctx.elements.current];
  if (!allElements.length) return;

  ctx.setIsBeautifying(true);
  try {
    const updates = await getAILayout(allElements, apiKey);
    if (!updates.length) return;

    const updateMap = new Map(updates.map((u) => [u.id, u]));
    ctx.elements.current = applyLayoutUpdates(ctx.elements.current, updateMap);

    const allIds = new Set(ctx.elements.current.map((element) => element.id));
    ctx.elements.current = ctx.syncBoundArrows(allIds, ctx.elements.current);

    ctx.pushHistorySnapshot([...ctx.elements.current]);
    ctx.renderSceneAndSelection();
  } finally {
    ctx.setIsBeautifying(false);
  }
}

export function applyThemeColors(
  ctx: CanvasEffectsContext,
  isDark: boolean,
  options: { recordHistory?: boolean } = {},
) {
  const result = recolorByTheme(
    ctx.elements.current,
    ctx.selectedElementsList(),
    isDark,
  );

  ctx.setStrokeColor(result.newDefaultStroke);
  ctx.elements.current = result.elements.map(
    (element) =>
      result.selected.find((selected) => selected.id === element.id) ?? element,
  );

  if (result.changed && options.recordHistory !== false) {
    ctx.pushHistorySnapshot([...ctx.elements.current]);
  }
  ctx.renderSceneAndSelection();
  return result.changed;
}
