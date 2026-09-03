import { createHistory } from "@repo/element/history";
import type { Point, SketchElement } from "@repo/element/types";
import { buildImageElement } from "../tools/image";
import {
  actionDeleteSelected,
  actionDeselect,
  actionDuplicateSelected,
} from "../actions/selection";
import { actionAddElement, actionInsertElements } from "../actions/elements";
import { cloneElementsForPaste, getSelectedElements } from "@repo/element";
import type { SketchEditor } from "../editor/sketchEditor";

export function undoCanvas(editor: SketchEditor) {
  if (!editor.undo()) return;
  editor.renderSceneAndSelection();
}

export function redoCanvas(editor: SketchEditor) {
  if (!editor.redo()) return;
  editor.renderSceneAndSelection();
}

export function deleteSelectedElements(editor: SketchEditor) {
  const result = editor.dispatch(actionDeleteSelected, undefined);
  if (!result) return;

  editor.renderSceneAndSelection();
}

export function duplicateSelectedElements(
  editor: SketchEditor,
  offset: number,
) {
  const result = editor.dispatch(actionDuplicateSelected, { offset });
  if (!result) return;

  editor.renderSceneAndSelection();
}

export function deselectCanvas(editor: SketchEditor) {
  const result = editor.dispatch(actionDeselect, undefined);
  if (!result) return;

  editor.renderSceneAndSelection();
}

/**
 * Replaces the whole scene and starts a fresh history, so an undo cannot walk
 * back into the document that was open before.
 */
export function replaceCanvasElements(
  editor: SketchEditor,
  newElements: SketchElement[],
) {
  editor.frame.history = createHistory();
  editor.commitSceneElements(newElements);
  editor.renderSceneAndSelection();
}

/**
 * Reads an image `File` as a data URL and drops it onto the scene at the given
 * canvas-space point. Shared by drag-and-drop and clipboard paste.
 */
function insertImageFromFile(
  editor: SketchEditor,
  file: File,
  canvasPoint: Point,
) {
  if (!file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.onload = () => {
    const element = buildImageElement(canvasPoint, reader.result as string);
    editor.dispatch(actionAddElement, {
      element,
      select: false,
    });
    editor.renderScene();
  };
  reader.readAsDataURL(file);
}

/** Returns the first image file found on a clipboard/drag payload, if any. */
function getImageFileFromTransfer(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (const item of data.items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  // Fallback for browsers that only populate `files`.
  for (const file of data.files) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

export function handleImageDrop(
  editor: SketchEditor,
  event: DragEvent,
  point: Point,
) {
  const file = getImageFileFromTransfer(event.dataTransfer);
  if (!file) return;
  insertImageFromFile(editor, file, editor.screenToCanvas(point));
}

/**
 * Pastes an image from the clipboard onto the canvas at `canvasPoint`
 * (canvas-space). Returns true when an image was found and insertion started,
 * so the caller can `preventDefault()` and skip element/text paste.
 */
export function pasteImageFromClipboard(
  editor: SketchEditor,
  clipboardData: DataTransfer | null,
  canvasPoint: Point,
): boolean {
  const file = getImageFileFromTransfer(clipboardData);
  if (!file) return false;
  insertImageFromFile(editor, file, canvasPoint);
  return true;
}

export function getSelectedCanvasElements(
  editor: SketchEditor,
): SketchElement[] {
  return getSelectedElements(
    editor.getElements(),
    new Set(editor.getState().selectedElementIds),
  );
}

export function pasteCanvasElements(
  editor: SketchEditor,
  sourceElements: SketchElement[],
  offset: Point,
): boolean {
  if (sourceElements.length === 0) {
    return false;
  }
  const pastedElements = cloneElementsForPaste(sourceElements, offset);

  const result = editor.dispatch(actionInsertElements, {
    elements: pastedElements,
  });

  if (!result) return false;

  editor.renderSceneAndSelection();
  return true;
}
