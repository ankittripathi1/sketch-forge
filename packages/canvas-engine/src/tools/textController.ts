import type { Point, SketchElement } from "@repo/element/types";
import { hitTestElement } from "@repo/element/bounds";
import {
  canEditTextForElement,
  getTextEditPreviewElement,
  openTextCreationEditor,
  openTextEditEditor,
} from "./text";
import type { SketchEditor } from "../editor/sketchEditor";
import { getTextEditorStyle } from "../lib/toolStyleController";

export function startTextCreation(
  editor: SketchEditor,
  screenPoint: Point,
  point: Point,
) {
  editor.commitSelectedElements();
  openTextCreationEditor({
    screenPoint,
    point,
    style: getTextEditorStyle(editor, editor.frame.zoom),
  }).then((element) => {
    if (element) {
      editor.commitCreatedElement(element);
      editor.renderSceneAndSelection();
    }
  });
}

function restoreSelectedElement(editor: SketchEditor, element: SketchElement) {
  editor.setSelectedElements([element]);
  editor.setSelectedTool(element.tool);
  editor.renderSelection();
}

export function editSelectedText(editor: SketchEditor) {
  const selected = editor.selectedElementsList();
  if (selected.length !== 1) return;
  const element = selected[0]!;
  if (!canEditTextForElement(element)) return;

  const screenPos =
    element.tool === "text"
      ? editor.canvasToScreen({ x: element.x1, y: element.y1 })
      : editor.canvasToScreen({
          x: Math.min(element.x1, element.x2),
          y: Math.min(element.y1, element.y2),
        });

  editor.setSelectedElements([getTextEditPreviewElement(element)]);
  editor.renderSceneAndSelection();

  openTextEditEditor({
    element,
    screenPoint: screenPos,
    style: getTextEditorStyle(editor, editor.frame.zoom),
  }).then((updated) => {
    if (!updated) {
      restoreSelectedElement(editor, element);
      return;
    }
    editor.saveSelectedElementEdit(updated);
    editor.renderSceneAndSelection();
  });
}

export function handleTextDoubleClick(
  editor: SketchEditor,
  screenPoint: Point,
) {
  if (editor.getState().activeTool === "text") {
    const point = editor.screenToCanvas(screenPoint);
    startTextCreation(editor, screenPoint, point);
    return;
  }

  if (editor.getState().activeTool !== "select") return;

  const point = editor.screenToCanvas(screenPoint);
  const hit = [...editor.frame.elements]
    .reverse()
    .find((el) => hitTestElement(el, point, 8 / editor.frame.zoom));

  if (!hit || !canEditTextForElement(hit)) return;

  if (!editor.getState().selectedElementIds.has(hit.id)) {
    editor.setSelectedElements([hit]);
    editor.setSelectedTool(hit.tool);
    editor.renderSceneAndSelection();
  }
  editSelectedText(editor);
}
