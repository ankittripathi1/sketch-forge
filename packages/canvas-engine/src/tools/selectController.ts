import type {
  AnchorSide,
  Point,
  SketchElement,
  Tool,
} from "@repo/canvas-core/types";
import {
  addToSelection,
  setSelection,
  toggleSelection,
} from "../lib/selectionModel";
import {
  getResizeAnchorPreview,
  getSelectFinalizeAction,
  getSelectPointerDownAction,
  getSelectPointerMoveAction,
  moveSelectedElements,
  type SelectionMarquee,
  type SelectInteraction,
} from "./select";

type Ref<T> = { current: T };

type BindableShape = { shape: SketchElement; anchor: AnchorSide };

export type SelectControllerContext = {
  elements: Ref<SketchElement[]>;
  selectedIds: Ref<Set<string>>;
  selectionMarquee: Ref<SelectionMarquee | null>;
  selectInteraction: Ref<SelectInteraction>;
  hoveredAnchor: Ref<BindableShape | null>;
  zoom: Ref<number>;
  screenToCanvas: (point: Point) => Point;
  selectedElementsList: () => SketchElement[];
  setSelectedElements: (next: SketchElement[]) => void;
  setSelectedTool: (tool: Tool | null) => void;
  syncToolbarStyleFromElement: (element: SketchElement) => void;
  clearSelection: () => void;
  applyResize: (
    element: SketchElement,
    handle: number,
    point: Point,
  ) => SketchElement;
  syncBoundArrows: (
    shapeIds: Set<string>,
    elements: SketchElement[],
  ) => SketchElement[];
  findBindableShape: (
    point: Point,
    exclude?: Set<string>,
  ) => BindableShape | null;
  commitSelectedElementSnapshot: (options?: { render?: boolean }) => void;
  renderSceneAndSelection: () => void;
  renderSelection: () => void;
  scheduleSelectionRender: () => void;
  scheduleSceneAndSelectionRender: () => void;
};

export function handleSelectPointerDown(
  ctx: SelectControllerContext,
  point: Point,
  shiftKey: boolean,
) {
  const action = getSelectPointerDownAction({
    point,
    selected: ctx.selectedElementsList(),
    elements: ctx.elements.current,
    zoom: ctx.zoom.current,
    shiftKey,
  });

  switch (action.type) {
    case "start-drag":
      ctx.selectInteraction.current = {
        type: "dragging",
        lastPoint: point,
        moved: false,
      };
      return;

    case "start-resize":
      ctx.selectInteraction.current = {
        type: "resizing",
        handle: action.handle,
        origin: action.origin,
        moved: false,
      };
      return;

    case "toggle-element":
      ctx.selectedIds.current = toggleSelection(
        ctx.selectedIds.current,
        action.element.id,
      );
      ctx.setSelectedTool(null);
      ctx.renderSceneAndSelection();
      return;

    case "select-element":
      ctx.setSelectedElements([action.element]);
      ctx.setSelectedTool(action.element.tool);
      ctx.syncToolbarStyleFromElement(action.element);
      ctx.selectInteraction.current = {
        type: "dragging",
        lastPoint: point,
        moved: false,
      };
      ctx.renderSceneAndSelection();
      return;

    case "clear-selection":
      ctx.clearSelection();
      ctx.renderSceneAndSelection();
      return;

    case "start-marquee":
      ctx.selectionMarquee.current = action.marquee;
      ctx.selectInteraction.current = {
        type: "marquee",
        additive: action.additive,
      };
      ctx.renderSelection();
      return;

    case "none":
      return;
  }
}

export function handleSelectPointerMove(
  ctx: SelectControllerContext,
  screenPoint: Point,
) {
  const action = getSelectPointerMoveAction({
    interaction: ctx.selectInteraction.current,
    screenPoint,
    screenToCanvas: ctx.screenToCanvas,
    selectionMarquee: ctx.selectionMarquee.current,
    selectedCount: ctx.selectedIds.current.size,
  });

  switch (action.type) {
    case "update-marquee":
      ctx.selectionMarquee.current = action.marquee;
      ctx.scheduleSelectionRender();
      return true;

    case "resize": {
      const updated = ctx.applyResize(
        action.interaction.origin,
        action.interaction.handle,
        action.point,
      );
      ctx.selectInteraction.current = { ...action.interaction, moved: true };
      ctx.setSelectedElements([updated]);
      const movedIds = new Set([updated.id]);
      ctx.elements.current = ctx.syncBoundArrows(
        movedIds,
        ctx.elements.current,
      );
      ctx.hoveredAnchor.current = getResizeAnchorPreview({
        updated,
        handle: action.interaction.handle,
        point: action.point,
        findBindableShape: ctx.findBindableShape,
      });

      ctx.scheduleSceneAndSelectionRender();
      return true;
    }

    case "drag": {
      ctx.selectInteraction.current = {
        ...action.interaction,
        lastPoint: action.point,
        moved: true,
      };
      ctx.elements.current = moveSelectedElements(
        ctx.elements.current,
        ctx.selectedIds.current,
        action.dx,
        action.dy,
      );

      const movedIds = new Set(ctx.selectedIds.current);
      if (movedIds.size > 0) {
        ctx.elements.current = ctx.syncBoundArrows(
          movedIds,
          ctx.elements.current,
        );
      }

      ctx.scheduleSceneAndSelectionRender();
      return true;
    }

    case "none":
      return false;
  }
}

export function finalizeSelectInteraction(ctx: SelectControllerContext) {
  const action = getSelectFinalizeAction({
    interaction: ctx.selectInteraction.current,
    selectionMarquee: ctx.selectionMarquee.current,
    elements: ctx.elements.current,
  });
  ctx.selectInteraction.current = { type: "idle" };

  switch (action.type) {
    case "finish-marquee":
      if (action.ids.length > 0) {
        ctx.selectedIds.current = action.additive
          ? addToSelection(ctx.selectedIds.current, action.ids)
          : setSelection(action.ids);
      } else if (!action.additive) {
        ctx.selectedIds.current = setSelection([]);
        ctx.setSelectedTool(null);
      }
      ctx.selectionMarquee.current = null;
      ctx.renderSceneAndSelection();
      return;

    case "finish-resize":
      ctx.hoveredAnchor.current = null;
      if (action.moved && ctx.selectedIds.current.size > 0) {
        ctx.commitSelectedElementSnapshot();
      }
      return;

    case "finish-drag":
      if (!action.moved || ctx.selectedIds.current.size === 0) return;
      ctx.commitSelectedElementSnapshot({ render: true });
      return;

    case "none":
      return;
  }
}
