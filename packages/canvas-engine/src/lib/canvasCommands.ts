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

/**
 * Everything these commands need beyond the editor itself: turning a screen
 * point into canvas space, and painting. Both belong to the canvas surface, not
 * to the scene.
 */
export type CanvasCommandsContext = {
  editor: SketchEditor;
  screenToCanvas: (point: Point) => Point;
  renderScene: () => void;
  renderSceneAndSelection: () => void;
};

export function undoCanvas(ctx: CanvasCommandsContext) {
  if (!ctx.editor.undo()) return;
  ctx.renderSceneAndSelection();
}

export function redoCanvas(ctx: CanvasCommandsContext) {
  if (!ctx.editor.redo()) return;
  ctx.renderSceneAndSelection();
}

export function deleteSelectedElements(ctx: CanvasCommandsContext) {
  const result = ctx.editor.dispatch(actionDeleteSelected, undefined);
  if (!result) return;

  ctx.renderSceneAndSelection();
}

export function duplicateSelectedElements(
  ctx: CanvasCommandsContext,
  offset: number,
) {
  const result = ctx.editor.dispatch(actionDuplicateSelected, { offset });
  if (!result) return;

  ctx.renderSceneAndSelection();
}

export function deselectCanvas(ctx: CanvasCommandsContext) {
  const result = ctx.editor.dispatch(actionDeselect, undefined);
  if (!result) return;

  ctx.renderSceneAndSelection();
}

/**
 * Replaces the whole scene and starts a fresh history, so an undo cannot walk
 * back into the document that was open before.
 */
export function replaceCanvasElements(
  ctx: CanvasCommandsContext,
  newElements: SketchElement[],
) {
  ctx.editor.frame.history = createHistory();
  ctx.editor.commitSceneElements(newElements);
  ctx.renderSceneAndSelection();
}

/**
 * Reads an image `File` as a data URL and drops it onto the scene at the given
 * canvas-space point. Shared by drag-and-drop and clipboard paste.
 */
function insertImageFromFile(
  ctx: CanvasCommandsContext,
  file: File,
  canvasPoint: Point,
) {
  if (!file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.onload = () => {
    const element = buildImageElement(canvasPoint, reader.result as string);
    ctx.editor.dispatch(actionAddElement, {
      element,
      select: false,
    });
    ctx.renderScene();
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
  ctx: CanvasCommandsContext,
  event: DragEvent,
  point: Point,
) {
  const file = getImageFileFromTransfer(event.dataTransfer);
  if (!file) return;
  insertImageFromFile(ctx, file, ctx.screenToCanvas(point));
}

/**
 * Pastes an image from the clipboard onto the canvas at `canvasPoint`
 * (canvas-space). Returns true when an image was found and insertion started,
 * so the caller can `preventDefault()` and skip element/text paste.
 */
export function pasteImageFromClipboard(
  ctx: CanvasCommandsContext,
  clipboardData: DataTransfer | null,
  canvasPoint: Point,
): boolean {
  const file = getImageFileFromTransfer(clipboardData);
  if (!file) return false;
  insertImageFromFile(ctx, file, canvasPoint);
  return true;
}

export function getSelectedCanvasElements(
  ctx: CanvasCommandsContext,
): SketchElement[] {
  return getSelectedElements(
    ctx.editor.getElements(),
    new Set(ctx.editor.getState().selectedElementIds),
  );
}

export function pasteCanvasElements(
  ctx: CanvasCommandsContext,
  sourceElements: SketchElement[],
  offset: Point,
): boolean {
  if (sourceElements.length === 0) {
    return false;
  }
  const pastedElements = cloneElementsForPaste(sourceElements, offset);

  const result = ctx.editor.dispatch(actionInsertElements, {
    elements: pastedElements,
  });

  if (!result) return false;

  ctx.renderSceneAndSelection();
  return true;
}
