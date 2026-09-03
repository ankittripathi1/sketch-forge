import type { SketchElement } from "@repo/element/types";
import { getToolbarStyleFromElement } from "./toolStyle";
import type { TextEditorStyle } from "../tools/text";
import type { SketchEditor } from "../editor/sketchEditor";

/**
 * Points the toolbar at an element's style, without writing back to it.
 *
 * Called when the selection changes, so the style controls show what the
 * selected element actually looks like.
 */
export function syncToolbarStyleFromElement(
  editor: SketchEditor,
  element: SketchElement,
) {
  const style = getToolbarStyleFromElement(element);
  editor.setToolbarStyle({
    strokeColor: style.strokeColor,
    fillColor: style.fillColor,
    fillStyle: style.fillStyle,
    strokeWidth: style.strokeWidth,
    ...(style.fontFamily ? { fontFamily: style.fontFamily } : {}),
    ...(style.fontSize ? { fontSize: style.fontSize } : {}),
    ...(style.fontWeight ? { fontWeight: style.fontWeight } : {}),
    ...(style.textAlign ? { textAlign: style.textAlign } : {}),
    ...(style.textVerticalAlign
      ? { textVerticalAlign: style.textVerticalAlign }
      : {}),
  });
}

/**
 * The style a DOM text editor overlay is rendered with. Takes `zoom` because
 * that is frame state, not view state, so it is not on the editor's store.
 */
export function getTextEditorStyle(
  editor: SketchEditor,
  zoom: number,
): TextEditorStyle {
  const style = editor.getState().currentItemStyle;
  return {
    strokeColor: style.strokeColor,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    zoom,
  };
}
