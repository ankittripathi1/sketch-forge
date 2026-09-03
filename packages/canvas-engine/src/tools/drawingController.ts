import type { Point, Tool } from "@repo/element/types";
import { clearCanvas } from "../lib/transform";
import {
  bindArrowEnd,
  buildDraftElement,
  eraseIntersectingElements,
  getDraftEnd,
  getDraftStart,
  isStrokeDraft,
  updateDraftElement,
} from "./drawing";
import type { SketchEditor } from "../editor/sketchEditor";
import { queueScribbleStroke } from "../lib/scribbleController";

export type { CanvasInteraction } from "./interactions";

/** The style a new element is drawn with, taken from the toolbar. */
function draftStyle(editor: SketchEditor) {
  const { strokeColor, fillColor, fillStyle, strokeWidth } =
    editor.getState().currentItemStyle;
  return { strokeColor, fillColor, fillStyle, strokeWidth };
}

export function startDrawing(editor: SketchEditor, point: Point) {
  const activeTool = editor.getState().activeTool as Tool;
  editor.frame.canvasInteraction = { type: "drawing" };
  const { startBinding, startPoint } = getDraftStart({
    tool: activeTool,
    point,
    findBindableShape: editor.findBindableShape,
  });
  editor.frame.currentElement = buildDraftElement({
    tool: activeTool,
    point,
    style: draftStyle(editor),
    startBinding,
    startPoint,
  });
  editor.renderActiveElement();
}

export function updateArrowHover(editor: SketchEditor, point: Point) {
  const activeTool = editor.getState().activeTool;
  if (
    activeTool !== "arrow" ||
    editor.frame.canvasInteraction.type === "drawing"
  )
    return false;

  const target = editor.findBindableShape(point);
  const next = target ? { shape: target.shape, anchor: target.anchor } : null;
  const prev = editor.frame.hoveredAnchor;
  const changed =
    (!prev && next) ||
    (prev && !next) ||
    (prev &&
      next &&
      (prev.shape.id !== next.shape.id || prev.anchor !== next.anchor));
  if (changed) {
    editor.frame.hoveredAnchor = next;
    editor.scheduleActiveElementRender();
  }
  return true;
}

export function handleDrawingPointerMove(editor: SketchEditor, point: Point) {
  if (
    editor.frame.canvasInteraction.type !== "drawing" ||
    !editor.frame.currentElement
  )
    return;

  const { endPoint, anchorHint } = getDraftEnd({
    element: editor.frame.currentElement,
    point,
    findBindableShape: editor.findBindableShape,
  });
  editor.frame.hoveredAnchor = anchorHint;

  editor.frame.currentElement = updateDraftElement(
    editor.frame.currentElement,
    point,
    endPoint,
  );
  editor.scheduleActiveElementRender();
}

export function finalizeDrawingInteraction(editor: SketchEditor) {
  const activeTool = editor.getState().activeTool as Tool;
  if (
    editor.frame.canvasInteraction.type !== "drawing" ||
    !editor.frame.currentElement
  )
    return;

  editor.frame.canvasInteraction = { type: "idle" };
  cancelAnimationFrame(editor.frame.interactionRafId);

  if (activeTool === "eraser") {
    const nextElements = eraseIntersectingElements(
      editor.frame.elements,
      editor.frame.currentElement,
    );
    editor.frame.currentElement = null;
    editor.commitSceneElements(nextElements);
    editor.renderSceneAndSelection();
    return;
  }

  let justCreated = editor.normalizeElement(editor.frame.currentElement);
  editor.frame.currentElement = null;
  editor.frame.hoveredAnchor = null;

  justCreated = bindArrowEnd(justCreated, editor.findBindableShape);

  if (isStrokeDraft(activeTool)) {
    editor.commitCreatedElement(justCreated, { select: false });
    editor.renderScene();

    if (activeTool === "freehand" && editor.getState().scribbleEnabled) {
      queueScribbleStroke(editor, justCreated.id);
    }

    const interactionCanvas = editor.surface.interaction();
    if (interactionCanvas) clearCanvas(interactionCanvas);
    return;
  }

  editor.commitCreatedElement(justCreated);
  editor.renderSceneAndSelection();
}
