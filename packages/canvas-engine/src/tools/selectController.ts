import type { Point } from "@repo/element/types";
import {
  addToSelection,
  setSelection,
  toggleSelection,
} from "@repo/element/selection";
import {
  getResizeAnchorPreview,
  getSelectFinalizeAction,
  getSelectPointerDownAction,
  getSelectPointerMoveAction,
  moveSelectedElements,
} from "./select";
import type { SketchEditor } from "../editor/sketchEditor";
import { syncToolbarStyleFromElement } from "../lib/toolStyleController";

export function handleSelectPointerDown(
  editor: SketchEditor,
  point: Point,
  shiftKey: boolean,
) {
  const action = getSelectPointerDownAction({
    point,
    selected: editor.selectedElementsList(),
    elements: editor.frame.elements,
    zoom: editor.frame.zoom,
    shiftKey,
  });

  switch (action.type) {
    case "start-drag":
      editor.frame.selectInteraction = {
        type: "dragging",
        lastPoint: point,
        moved: false,
      };
      return;

    case "start-resize":
      editor.frame.selectInteraction = {
        type: "resizing",
        handle: action.handle,
        origin: action.origin,
        moved: false,
      };
      return;

    case "toggle-element":
      editor.setAppState({
        selectedElementIds: toggleSelection(
          new Set(editor.getState().selectedElementIds),
          action.element.id,
        ),
      });
      editor.setSelectedTool(null);
      editor.renderSceneAndSelection();
      return;

    case "select-element":
      editor.setSelectedElements([action.element]);
      editor.setSelectedTool(action.element.tool);
      syncToolbarStyleFromElement(editor, action.element);
      editor.frame.selectInteraction = {
        type: "dragging",
        lastPoint: point,
        moved: false,
      };
      editor.renderSceneAndSelection();
      return;

    case "clear-selection":
      editor.clearSelection();
      editor.renderSceneAndSelection();
      return;

    case "start-marquee":
      editor.frame.selectionMarquee = action.marquee;
      editor.frame.selectInteraction = {
        type: "marquee",
        additive: action.additive,
      };
      editor.renderSelection();
      return;

    case "none":
      return;
  }
}

export function handleSelectPointerMove(
  editor: SketchEditor,
  screenPoint: Point,
) {
  const action = getSelectPointerMoveAction({
    interaction: editor.frame.selectInteraction,
    screenPoint,
    screenToCanvas: editor.screenToCanvas,
    selectionMarquee: editor.frame.selectionMarquee,
    selectedCount: new Set(editor.getState().selectedElementIds).size,
  });

  switch (action.type) {
    case "update-marquee":
      editor.frame.selectionMarquee = action.marquee;
      editor.scheduleSelectionRender();
      return true;

    case "resize": {
      const updated = editor.applyResize(
        action.interaction.origin,
        action.interaction.handle,
        action.point,
      );
      editor.frame.selectInteraction = { ...action.interaction, moved: true };
      editor.setSelectedElements([updated]);
      const movedIds = new Set([updated.id]);
      editor.setSceneElements(
        editor.syncBoundArrows(movedIds, editor.frame.elements),
      );
      editor.frame.hoveredAnchor = getResizeAnchorPreview({
        updated,
        handle: action.interaction.handle,
        point: action.point,
        findBindableShape: editor.findBindableShape,
      });

      editor.scheduleSceneAndSelectionRender();
      return true;
    }

    case "drag": {
      editor.frame.selectInteraction = {
        ...action.interaction,
        lastPoint: action.point,
        moved: true,
      };
      editor.setSceneElements(
        moveSelectedElements(
          editor.frame.elements,
          new Set(editor.getState().selectedElementIds),
          action.dx,
          action.dy,
        ),
      );

      const movedIds = new Set(new Set(editor.getState().selectedElementIds));
      if (movedIds.size > 0) {
        editor.setSceneElements(
          editor.syncBoundArrows(movedIds, editor.frame.elements),
        );
      }

      editor.scheduleSceneAndSelectionRender();
      return true;
    }

    case "none":
      return false;
  }
}

export function finalizeSelectInteraction(editor: SketchEditor) {
  const action = getSelectFinalizeAction({
    interaction: editor.frame.selectInteraction,
    selectionMarquee: editor.frame.selectionMarquee,
    elements: editor.frame.elements,
  });
  editor.frame.selectInteraction = { type: "idle" };

  switch (action.type) {
    case "finish-marquee":
      if (action.ids.length > 0) {
        editor.setAppState({
          selectedElementIds: action.additive
            ? addToSelection(
                new Set(editor.getState().selectedElementIds),
                action.ids,
              )
            : setSelection(action.ids),
        });
      } else if (!action.additive) {
        editor.setAppState({
          selectedElementIds: setSelection([]),
          selectedTool: null,
        });
      }
      editor.frame.selectionMarquee = null;
      editor.renderSceneAndSelection();
      return;

    case "finish-resize":
      editor.frame.hoveredAnchor = null;
      if (
        action.moved &&
        new Set(editor.getState().selectedElementIds).size > 0
      ) {
        editor.commitSelectedElementSnapshot();
      }
      return;

    case "finish-drag":
      if (
        !action.moved ||
        new Set(editor.getState().selectedElementIds).size === 0
      )
        return;
      editor.commitSelectedElementSnapshot({ render: true });
      return;

    case "none":
      return;
  }
}
