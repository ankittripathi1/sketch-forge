import { getAILayout } from "@repo/canvas-core/lib/layoutAI";
import { applyLayoutUpdates } from "./beautify";
import { recolorByTheme } from "@repo/element/recolor";
import type { SketchEditor } from "../editor/sketchEditor";

export async function beautifyLayout(editor: SketchEditor) {
  const apiKey = editor.getState().recognitionApiKey?.trim();
  if (!apiKey) {
    throw new Error("A Gemini API key is required. Add it in Settings.");
  }

  const allElements = [...editor.frame.elements];
  if (!allElements.length) return;

  editor.setIsBeautifying(true);
  try {
    const updates = await getAILayout(allElements, apiKey);
    if (!updates.length) return;

    const updateMap = new Map(updates.map((u) => [u.id, u]));
    editor.setSceneElements(
      applyLayoutUpdates(editor.frame.elements, updateMap),
    );

    const allIds = new Set(editor.frame.elements.map((element) => element.id));
    editor.setSceneElements(
      editor.syncBoundArrows(allIds, editor.frame.elements),
    );

    editor.pushHistorySnapshot([...editor.frame.elements]);
    editor.renderSceneAndSelection();
  } finally {
    editor.setIsBeautifying(false);
  }
}

export function applyThemeColors(
  editor: SketchEditor,
  isDark: boolean,
  options: { recordHistory?: boolean } = {},
) {
  const result = recolorByTheme(
    editor.frame.elements,
    editor.selectedElementsList(),
    isDark,
  );

  editor.setToolbarStyle({ strokeColor: result.newDefaultStroke });
  editor.setSceneElements(
    result.elements.map(
      (element) =>
        result.selected.find((selected) => selected.id === element.id) ??
        element,
    ),
  );

  if (result.changed && options.recordHistory !== false) {
    editor.pushHistorySnapshot([...editor.frame.elements]);
  }
  editor.renderSceneAndSelection();
  return result.changed;
}
