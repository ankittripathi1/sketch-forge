import type { ActiveTool, Point, SketchElement, Tool } from "@repo/element/types";
import { hitTestElement } from "@repo/element/bounds";
import {
  canEditTextForElement,
  getTextEditPreviewElement,
  openTextCreationEditor,
  openTextEditEditor,
  type TextEditorStyle,
} from "./text";

type Ref<T> = { current: T };

export type TextControllerContext = {
  tool: ActiveTool;
  elements: Ref<SketchElement[]>;
  selectedIds: Ref<Set<string>>;
  zoom: Ref<number>;
  screenToCanvas: (point: Point) => Point;
  canvasToScreen: (point: Point) => Point;
  textEditorStyle: () => TextEditorStyle;
  selectedElementsList: () => SketchElement[];
  commitSelectedElements: () => void;
  commitCreatedElement: (element: SketchElement) => void;
  saveSelectedElementEdit: (element: SketchElement) => void;
  clearSelection: () => void;
  setSelectedElements: (next: SketchElement[]) => void;
  setSelectedTool: (tool: Tool | null) => void;
  renderSceneAndSelection: () => void;
  renderSelection: () => void;
};

export function startTextCreation(
  ctx: TextControllerContext,
  screenPoint: Point,
  point: Point,
) {
  ctx.commitSelectedElements();
  openTextCreationEditor({
    screenPoint,
    point,
    style: ctx.textEditorStyle(),
  }).then((element) => {
    if (element) ctx.commitCreatedElement(element);
  });
}

function restoreSelectedElement(
  ctx: TextControllerContext,
  element: SketchElement,
) {
  ctx.setSelectedElements([element]);
  ctx.setSelectedTool(element.tool);
  ctx.renderSelection();
}

export function editSelectedText(ctx: TextControllerContext) {
  const selected = ctx.selectedElementsList();
  if (selected.length !== 1) return;
  const element = selected[0]!;
  if (!canEditTextForElement(element)) return;

  const screenPos =
    element.tool === "text"
      ? ctx.canvasToScreen({ x: element.x1, y: element.y1 })
      : ctx.canvasToScreen({
        x: Math.min(element.x1, element.x2),
        y: Math.min(element.y1, element.y2),
      });

  ctx.setSelectedElements([getTextEditPreviewElement(element)])
  ctx.renderSceneAndSelection()

  openTextEditEditor({
    element,
    screenPoint: screenPos,
    style: ctx.textEditorStyle(),
  }).then((updated) => {
    if (!updated) {
      restoreSelectedElement(ctx, element);
      return;
    }
    ctx.saveSelectedElementEdit(updated);
  });
}

export function handleTextDoubleClick(
  ctx: TextControllerContext,
  screenPoint: Point,
) {
  if (ctx.tool === "text") {
    const point = ctx.screenToCanvas(screenPoint);
    startTextCreation(ctx, screenPoint, point);
    return;
  }

  if (ctx.tool !== "select") return;

  const point = ctx.screenToCanvas(screenPoint);
  const hit = [...ctx.elements.current]
    .reverse()
    .find((el) => hitTestElement(el, point, 8 / ctx.zoom.current));

  if (!hit || !canEditTextForElement(hit)) return;

  if (!ctx.selectedIds.current.has(hit.id)) {
    ctx.setSelectedElements([hit]);
    ctx.setSelectedTool(hit.tool);
    ctx.renderSceneAndSelection();
  }
  editSelectedText(ctx);
}
