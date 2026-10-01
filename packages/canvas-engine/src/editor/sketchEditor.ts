import type { StoreApi } from "zustand/vanilla";
import type { ActiveTool, Point, SketchElement } from "@repo/element/types";
import { cloneElementsForPaste } from "@repo/element";
import { createHistory } from "@repo/element/history";
import type { CanvasAppState, CanvasTheme, CurrentItemStyle } from "../appState";
import {
  createEditorInternals,
  type SketchEditorOptions,
} from "./editorInternals";
import {
  actionDeleteSelected,
  actionDeselect,
  actionDuplicateSelected,
} from "../actions/selection";
import {
  actionAddElement,
  actionInsertElements,
  actionReplaceScene,
} from "../actions/elements";
import { getContextualPasteTranslation } from "../lib/pastePlacement";
import {
  applyThemeColors,
  beautifyLayout,
} from "../lib/canvasEffectsController";
import {
  beginPanning,
  getCursorForPoint,
  handlePanningMove,
  panViewport,
  zoomViewport,
} from "../lib/viewportController";
import {
  editSelectedText,
  handleTextDoubleClick,
  startTextCreation,
} from "../tools/textController";
import {
  finalizeSelectInteraction,
  handleSelectPointerDown,
  handleSelectPointerMove,
} from "../tools/selectController";
import {
  finalizeDrawingInteraction,
  handleDrawingPointerMove,
  startDrawing,
  updateArrowHover,
} from "../tools/drawingController";
import {
  buildImageElement,
  getImageFileFromTransfer,
  readImageFile,
} from "../tools/image";

export type { SketchEditorOptions };

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 20;
const DUPLICATE_OFFSET = 24;
/** The fill a shape gets when its fill style is switched on from "none". */
const DEFAULT_FILL_COLOR = "#5a8ae8";

export type PointerButtons = { button: number; shiftKey: boolean };

export type RecognitionSettings = Pick<
  CanvasAppState,
  "scribbleEnabled" | "recognitionBackend" | "recognitionApiKey"
>;

/**
 * The canvas editor.
 *
 * Owns the scene, the history and the view state, and is the only thing that
 * writes any of them. Every method that changes what is on screen also draws
 * it, so callers never render by hand. Points passed in are screen points,
 * relative to the canvas's top-left corner.
 *
 * Built without React so a test can drive it directly:
 *
 *   const editor = createSketchEditor();
 *   editor.setTool("rectangle");
 *   editor.pointerDown({ x: 0, y: 0 }, { button: 0, shiftKey: false });
 *   editor.pointerMove({ x: 50, y: 50 });
 *   editor.pointerUp();
 *   expect(editor.getElements()).toHaveLength(1);
 *
 * React reads view state through `store` (see `useEditorState`).
 */
export function createSketchEditor(options: SketchEditorOptions = {}) {
  const internals = createEditorInternals(options);
  const { frame } = internals;

  /** Inserts an image so its top-left corner sits at `canvasPoint`. */
  async function insertImage(file: File, canvasPoint: Point) {
    const src = await readImageFile(file);
    internals.dispatch(actionAddElement, {
      element: buildImageElement(canvasPoint, src),
      select: false,
    });
    internals.renderScene();
  }

  /** Where pasted elements should move to, by the shared placement rule. */
  function pasteTranslation(elements: SketchElement[]): Point {
    return getContextualPasteTranslation(elements, {
      selectedElements: internals.selectedElementsList(),
      pointer: internals.getPointerPosition(),
      viewport: internals.getViewportBounds(),
    });
  }

  function pointerDown(screenPoint: Point, { button, shiftKey }: PointerButtons) {
    frame.pointerScreenPosition = screenPoint;
    const tool = internals.getState().activeTool;
    if (tool === "select" && button === 2) return;
    if (internals.getState().panMode) {
      beginPanning(internals, screenPoint);
      return;
    }

    const point = internals.screenToCanvas(screenPoint);
    if (tool === "text") {
      startTextCreation(internals, screenPoint, point);
      return;
    }

    if (tool !== "select" && internals.getState().selectedElementIds.size > 0) {
      internals.commitSelectedElements();
      internals.renderSceneAndSelection();
    }

    if (tool === "select") {
      handleSelectPointerDown(internals, point, shiftKey);
      return;
    }
    startDrawing(internals, point);
  }

  function pointerMove(screenPoint: Point) {
    frame.pointerScreenPosition = screenPoint;
    if (handlePanningMove(internals, screenPoint)) return;
    if (
      internals.getState().activeTool === "select" &&
      handleSelectPointerMove(internals, screenPoint)
    )
      return;
    const point = internals.screenToCanvas(screenPoint);
    if (updateArrowHover(internals, point)) return;
    handleDrawingPointerMove(internals, point);
  }

  function pointerUp() {
    if (frame.canvasInteraction.type === "panning") {
      frame.canvasInteraction = { type: "idle" };
      return;
    }
    if (internals.getState().activeTool === "select") {
      finalizeSelectInteraction(internals);
      return;
    }
    finalizeDrawingInteraction(internals);
  }

  return {
    /** View state, read-only. Subscribe with `useEditorState`. */
    store: internals.store as Pick<
      StoreApi<CanvasAppState>,
      "getState" | "getInitialState" | "subscribe"
    >,
    getState: internals.getState,
    getElements: internals.getElements,
    getSelectedElements: internals.selectedElementsList,
    /** The CSS cursor for a pointer at `screenPoint`. */
    getCursorForPoint: (screenPoint: Point) =>
      getCursorForPoint(internals, screenPoint),

    /**
     * Replaces the whole scene and starts a fresh history at it, so undo can't
     * walk back past what was loaded. Loading isn't an edit, so it doesn't
     * fire `onChange`.
     */
    loadScene(elements: SketchElement[]) {
      frame.history = createHistory(elements);
      internals.dispatch(actionReplaceScene, {
        elements,
        captureUpdate: "none",
      });
      internals.publishHistoryStatus();
      internals.renderSceneAndSelection();
    },

    pointerDown,
    pointerMove,
    pointerUp,
    /** Ends any gesture and forgets the pointer, so paste falls back to the viewport. */
    pointerLeave() {
      pointerUp();
      frame.pointerScreenPosition = null;
    },
    doubleClick: (screenPoint: Point) =>
      handleTextDoubleClick(internals, screenPoint),
    zoomAt: (delta: number, screenPoint: Point) =>
      zoomViewport({
        editor: internals,
        cursorScreen: screenPoint,
        delta,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
      }),
    panBy: (dx: number, dy: number) => panViewport(internals, dx, dy),
    /** Drops the first image in `data` with its top-left at `screenPoint`. */
    dropFiles(data: DataTransfer | null, screenPoint: Point) {
      const file = getImageFileFromTransfer(data);
      if (!file) return;
      void insertImage(file, internals.screenToCanvas(screenPoint));
    },

    undo() {
      if (!internals.undo()) return false;
      internals.renderSceneAndSelection();
      return true;
    },
    redo() {
      if (!internals.redo()) return false;
      internals.renderSceneAndSelection();
      return true;
    },
    deleteSelected() {
      if (!internals.dispatch(actionDeleteSelected, undefined)) return;
      internals.renderSceneAndSelection();
    },
    duplicateSelected() {
      const result = internals.dispatch(actionDuplicateSelected, {
        offset: DUPLICATE_OFFSET,
      });
      if (!result) return;
      internals.renderSceneAndSelection();
    },
    deselect() {
      if (!internals.dispatch(actionDeselect, undefined)) return;
      internals.renderSceneAndSelection();
    },
    editSelected: () => editSelectedText(internals),
    /**
     * Pastes copies of `elements`: next to the selection, else under the
     * pointer, else in the middle of the viewport. Returns false when there was
     * nothing to paste.
     */
    paste(elements: SketchElement[]) {
      if (elements.length === 0) return false;
      const pasted = cloneElementsForPaste(elements, pasteTranslation(elements));
      if (!internals.dispatch(actionInsertElements, { elements: pasted }))
        return false;
      internals.renderSceneAndSelection();
      return true;
    },
    /**
     * Pastes the first image in `data`, placed by the same rule as `paste`.
     * Returns true when an image was found, so the caller can consume the event.
     */
    pasteImage(data: DataTransfer | null) {
      const file = getImageFileFromTransfer(data);
      if (!file) return false;
      // Place a stand-in of the image's size, then insert the real one there.
      const offset = pasteTranslation([buildImageElement({ x: 0, y: 0 }, "")]);
      void insertImage(file, offset);
      return true;
    },

    setTool(tool: ActiveTool) {
      internals.setActiveTool(tool);
      internals.renderSelection();
    },
    /**
     * Applies a style to the toolbar and to the selected elements. Switching
     * the fill on from "none" also picks a default fill colour, so the shape
     * does not stay empty.
     */
    setStyle(style: Partial<CurrentItemStyle>) {
      const next = { ...style };
      if (
        next.fillStyle &&
        next.fillStyle !== "none" &&
        next.fillColor === undefined &&
        internals.getState().currentItemStyle.fillColor === "none"
      ) {
        next.fillColor = DEFAULT_FILL_COLOR;
      }
      if (!internals.setStyle(next)) return;
      internals.renderSceneAndSelection();
    },
    /** Space held: a drag pans. Releasing it also ends a pan in progress. */
    setPanMode(panMode: boolean) {
      internals.setAppState({ panMode });
      if (!panMode && frame.canvasInteraction.type === "panning") {
        frame.canvasInteraction = { type: "idle" };
      }
    },
    setTheme: (theme: CanvasTheme) => internals.setTheme(theme),
    /**
     * Swaps elements still using the other theme's default stroke to this
     * theme's. Returns whether anything changed.
     */
    applyThemeColors: (isDark: boolean, opts?: { recordHistory?: boolean }) =>
      applyThemeColors(internals, isDark, opts),
    setRecognitionSettings: (settings: Partial<RecognitionSettings>) =>
      internals.setAppState(settings),

    /** Rearranges the scene with Gemini. Throws when no API key is set. */
    beautify: () => beautifyLayout(internals),

    /** Redraws both canvases, e.g. after they were resized. */
    redraw: internals.renderSceneAndSelection,
  };
}

export type SketchEditor = ReturnType<typeof createSketchEditor>;
