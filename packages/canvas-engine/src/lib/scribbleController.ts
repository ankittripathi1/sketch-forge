import {
  debounceForBackend,
  recognizeHandwriting,
} from "@repo/canvas-core/lib/recognition";
import { buildTextFromStrokes } from "./scribble";
import type { EditorInternals } from "../editor/editorInternals";

/** The recognition settings, in the shape `@repo/canvas-core` expects. */
function recognitionConfig(editor: EditorInternals) {
  const state = editor.getState();
  return { backend: state.recognitionBackend, apiKey: state.recognitionApiKey };
}

export function queueScribbleStroke(editor: EditorInternals, id: string) {
  editor.frame.pendingScribbleIds.push(id);
  editor.setScribblePending(true);
  if (editor.frame.scribbleTimer) clearTimeout(editor.frame.scribbleTimer);

  const debounceMs = debounceForBackend(editor.getState().recognitionBackend);
  editor.frame.scribbleTimer = setTimeout(() => {
    void flushScribbleBatch(editor);
  }, debounceMs);
}

export async function flushScribbleBatch(editor: EditorInternals) {
  const ids = new Set(editor.frame.pendingScribbleIds);
  editor.frame.pendingScribbleIds = [];

  if (!ids.size) {
    editor.setScribblePending(false);
    return;
  }

  try {
    const strokeEls = editor.frame.elements.filter(
      (el) => el.tool === "freehand" && ids.has(el.id),
    );
    if (!strokeEls.length) return;

    const strokes = strokeEls
      .map((el) => el.points ?? [])
      .filter((pts) => pts.length >= 3);

    if (!strokes.length) return;

    const text = await recognizeHandwriting(strokes, recognitionConfig(editor));

    const style = editor.getState().currentItemStyle;
    const textEl = buildTextFromStrokes(strokes, text, {
      strokeColor: style.strokeColor,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
    });
    if (!textEl) return;

    editor.setSceneElements([
      ...editor.frame.elements.filter((el) => !ids.has(el.id)),
      textEl,
    ]);
    editor.pushHistorySnapshot();
    editor.renderScene();
  } finally {
    editor.setScribblePending(false);
  }
}
