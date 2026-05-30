"use client";

import { RefObject, useRef, useState } from "react";
import { SketchElement, Point, Tool, ActiveTool, FillStyle } from "@repo/canvas-core/types";
import type { AnchorSide } from "@repo/canvas-core/types";
import { createHistory } from "@repo/canvas-core/history";
import type { RecognitionConfig } from "@repo/canvas-core/lib/recognition";
import {
  screenToCanvas as screenToCanvasMath,
  canvasToScreen as canvasToScreenMath,
} from "@repo/math";
import * as geometry from "./lib/geometry";
import {
  applyThemeColors as applyControllerThemeColors,
  beautifyLayout as beautifyControllerLayout,
  type CanvasEffectsContext,
} from "./lib/canvasEffectsController";
import {
  applyFillColor as applyControllerFillColor,
  applyFillStyle as applyControllerFillStyle,
  applyFontFamily as applyControllerFontFamily,
  applyFontSize as applyControllerFontSize,
  applyFontWeight as applyControllerFontWeight,
  applyStrokeColor as applyControllerStrokeColor,
  applyStrokeWidth as applyControllerStrokeWidth,
  applyTextAlign as applyControllerTextAlign,
  applyTextVerticalAlign as applyControllerTextVerticalAlign,
  applyTool as applyControllerTool,
  getTextEditorStyle,
  syncToolbarStyleFromElement as syncControllerToolbarStyleFromElement,
  type ToolStyleControllerContext,
} from "./lib/toolStyleController";
import {
  queueScribbleStroke,
  type ScribbleControllerContext,
} from "./lib/scribbleController";
import {
  deleteSelectedElements,
  deselectCanvas,
  duplicateSelectedElements,
  handleImageDrop,
  redoCanvas,
  replaceCanvasElements,
  type CanvasCommandsContext,
  undoCanvas,
} from "./lib/canvasCommands";
import { pushHistorySnapshot as pushSnapshotToHistory } from "./lib/historyModel";
import {
  getSelectedElements,
  mergeElementsById,
  setSelection,
  updateElementsByIds,
} from "./lib/selectionModel";
import {
  beginPanning,
  getCursorForPoint as getViewportCursorForPoint,
  handlePanningMove,
  panViewport,
  type ViewportControllerContext,
  zoomViewport,
} from "./lib/viewportController";
import {
  editSelectedText,
  handleTextDoubleClick,
  startTextCreation as startTextControllerCreation,
  type TextControllerContext,
} from "./tools/textController";
import {
  findSingleSelectionHandle,
  type SelectionMarquee,
  type SelectInteraction,
} from "./tools/select";
import {
  finalizeSelectInteraction as finalizeSelectControllerInteraction,
  handleSelectPointerDown as handleSelectControllerPointerDown,
  handleSelectPointerMove as handleSelectControllerPointerMove,
  type SelectControllerContext,
} from "./tools/selectController";
import { createRenderers } from "./lib/rendering";
import { useCanvasUI } from "./store";
import {
  finalizeDrawingInteraction as finalizeDrawingControllerInteraction,
  handleDrawingPointerMove as handleDrawingControllerPointerMove,
  startDrawing as startDrawingController,
  updateArrowHover as updateControllerArrowHover,
  type CanvasInteraction,
  type DrawingControllerContext,
} from "./tools/drawingController";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 20;
const DUPLICATE_OFFSET = 24;

/**
 * useSketchEngine
 *
 * The central state machine for the canvas editor.  This single hook owns
 * ALL mutable canvas state and exposes a stable API that the page component
 * and UI panels consume.
 *
 * Architecture notes:
 *
 * TWO-CANVAS DESIGN
 *   The renderer uses two stacked <canvas> elements:
 *   - sceneCanvas (bottom): committed, stable elements — re-drawn only when the
 *     element list changes (add, delete, undo, redo, beautify, theme change).
 *   - interactionCanvas (top): transient state — the element being drawn right
 *     now, selection boxes, resize handles, the marquee rectangle.  This layer
 *     is redrawn on every pointer-move via requestAnimationFrame.
 *   Splitting the layers prevents expensive full-scene re-renders during fast
 *   pointer interactions.
 *
 * REFS vs STATE
 *   Elements, selection, zoom, pan, and drawing state are stored in refs rather
 *   than React state.  This lets them be mutated synchronously inside pointer
 *   event handlers without triggering re-renders on every mouse move.
 *   React state is used only for values that directly drive JSX: tool, colors,
 *   zoom display, history availability, and async operation flags.
 *
 * HISTORY
 *   The history module (createHistory) keeps a stack of element snapshots.
 *   Each snapshot is a plain SketchElement[].  undo() / redo() swap the entire
 *   array in one step.  The selected elements are merged into the snapshot so
 *   that selection state is also undoable.
 *
 * @param sceneCanvasRef       Ref to the bottom canvas (committed scene).
 * @param interactionCavasRef  Ref to the top canvas (transient interaction).
 */
export function useSketchEngine(
  sceneCanvasRef: RefObject<HTMLCanvasElement | null>,
  interactionCavasRef: RefObject<HTMLCanvasElement | null>,
  canvasMode: "light" | "dark" = "light",
  onChange?: () => void,
) {
  const {
    strokeColor,
    fillColor,
    fillStyle,
    strokeWidth,
    fontFamily,
    fontSize,
    fontWeight,
    textAlign,
    textVerticalAlign,
    scribbleEnabled,
    recognitionBackend,
    recognitionApiKey,
    setStrokeColor,
    setFillColor,
    setFillStyle,
    setStrokeWidth,
    setFontFamily,
    setFontSize,
    setFontWeight,
    setTextAlign,
    setTextVerticalAlign,
    setScribbleEnabled,
    setRecognitionBackend,
    setRecognitionApiKey,
  } = useCanvasUI();

  // ── Engine-internal state: stays in the hook (state machine + flow flags). ──
  const [tool, setTool] = useState<ActiveTool>("rectangle");
  const [historyStatus, setHistoryStatus] = useState({
    canUndo: false,
    canRedo: false,
  });
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [scribblePending, setScribblePending] = useState(false);
  const [isBeautifying, setIsBeautifying] = useState(false);
  /**
   * Mutable ref that mirrors recognitionBackend + recognitionApiKey state.
   *
   * Why a ref instead of reading state directly?
   * Scribble recognition and AI beautify run asynchronously from timers and
   * event handlers. By the time they run, the React closure that created them
   * may be stale — they'd read the old state values.
   * Writing to a ref on every render (two lines below) ensures the async
   * callbacks always see the current config without needing to be in a
   * useEffect dependency array.
   */
  const recognitionConfigRef = useRef<RecognitionConfig>({
    backend: "tesseract",
  });
  const [panOffsetDisplay, setPanOffsetDisplay] = useState<Point>({
    x: 0,
    y: 0,
  });

  const selectedIds = useRef<Set<string>>(new Set());
  const selectionMarquee = useRef<SelectionMarquee | null>(null);
  const selectInteraction = useRef<SelectInteraction>({ type: "idle" });
  const canvasInteraction = useRef<CanvasInteraction>({ type: "idle" });
  const elements = useRef<SketchElement[]>([]);
  const currentElement = useRef<SketchElement | null>(null);
  const isPanning = useRef(false);
  const zoom = useRef(1);
  const panOffset = useRef<Point>({ x: 0, y: 0 });
  const rafId = useRef<number>(0);
  const viewportRafId = useRef<number>(0);
  const history = useRef(createHistory());
  /**
   * The shape + anchor side the cursor is currently snapping to while drawing
   * or repositioning an arrow endpoint. Drives the anchor-hint overlay so the
   * user can see exactly where the arrow will connect before releasing.
   */
  const hoveredAnchor = useRef<{
    shape: SketchElement;
    anchor: AnchorSide;
  } | null>(null);
  /**
   * IDs of freehand stroke elements waiting to be recognised as a batch.
   * Strokes are accumulated here during the debounce window, then consumed
   * and cleared by the scribble controller.
   */
  const pendingScribbleIds = useRef<string[]>([]);
  /**
   * Handle for the debounce setTimeout.  Cleared and restarted each time a
   * new stroke is added, so the timer only fires after the user pauses.
   */
  const scribbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync the config ref on every render so async callbacks read fresh values.
  // This runs synchronously during render — before any effects or timers.
  recognitionConfigRef.current = {
    backend: recognitionBackend,
    apiKey: recognitionApiKey,
  };

  /**
   * Converts a screen-space point (CSS pixels relative to the canvas element)
   * to canvas-space coordinates, accounting for pan offset and zoom level.
   * Used in all pointer event handlers to translate cursor positions.
   */
  function screenToCanvas(point: Point): Point {
    return screenToCanvasMath(point, zoom.current, panOffset.current);
  }

  /**
   * Inverse of screenToCanvas.  Used when positioning the floating text
   * editor textarea over an existing text element.
   */
  function canvasToScreen(point: Point): Point {
    return canvasToScreenMath(point, zoom.current, panOffset.current);
  }

  /**
   * Redraws the entire committed scene onto the bottom canvas.
   *
   * Called after any operation that changes elements.current:
   * add, delete, undo, redo, theme change, beautify, scribble conversion.
   *
   * The onImageLoad callback passed to drawElement is renderScene itself,
   * so that image elements trigger a repaint once their src has loaded.
   */
  const renderers = createRenderers({
    sceneCanvas: sceneCanvasRef,
    interactionCanvas: interactionCavasRef,
    elements,
    selectedIds,
    currentElement,
    hoveredAnchor,
    selectionMarquee,
    zoom,
    panOffset,
    interactionRafId: rafId,
    viewportRafId,
    setPanOffsetDisplay,
  });
  const {
    renderScene,
    renderActiveElement,
    renderSelection,
    renderSceneAndSelection,
    scheduleSelectionRender,
    scheduleActiveElementRender,
    scheduleSceneAndSelectionRender,
    scheduleViewportRender,
  } = renderers;

  function pushHistorySnapshot(snapshot = elements.current) {
    setHistoryStatus(pushSnapshotToHistory(history.current, snapshot));
  }

  function selectedElementsList() {
    return getSelectedElements(elements.current, selectedIds.current);
  }

  function setSelectedElements(next: SketchElement[]) {
    elements.current = mergeElementsById(elements.current, next);
    selectedIds.current = setSelection(next.map((el) => el.id));
  }

  function clearSelection() {
    selectedIds.current = new Set();
    setSelectedTool(null);
  }

  function commitSelectedElements() {
    if (selectedIds.current.size === 0) return;
    selectedIds.current = new Set();
    setSelectedTool(null);
    renderSceneAndSelection();
  }

  function updateSelectedElements(updates: Partial<SketchElement>) {
    if (selectedIds.current.size === 0) return;
    elements.current = updateElementsByIds(
      elements.current,
      selectedIds.current,
      updates,
    );
    pushHistorySnapshot([...elements.current]);
    renderSceneAndSelection();
  }

  function syncToolbarStyleFromElement(element: SketchElement) {
    syncControllerToolbarStyleFromElement(
      toolStyleControllerContext(),
      element,
    );
  }

  function saveSelectedElementEdit(element: SketchElement) {
    setSelectedElements([element]);
    pushHistorySnapshot([...elements.current]);
    renderSceneAndSelection();
  }

  function commitCreatedElement(element: SketchElement) {
    setSelectedElements([element]);
    setSelectedTool(element.tool);
    pushHistorySnapshot([...elements.current]);
    setTool("select");
    renderSceneAndSelection();
  }

  function textEditorStyle() {
    return getTextEditorStyle(toolStyleControllerContext());
  }

  function toolStyleControllerContext(): ToolStyleControllerContext {
    return {
      tool,
      canvasMode,
      strokeColor,
      fontFamily,
      fontSize,
      fontWeight,
      zoom: zoom.current,
      setTool,
      setStrokeColor,
      setFillColor,
      setFillStyle,
      setStrokeWidth,
      setFontFamily,
      setFontSize,
      setFontWeight,
      setTextAlign,
      setTextVerticalAlign,
      updateSelectedElements,
      commitSelectedElements,
    };
  }

  function textControllerContext(): TextControllerContext {
    return {
      tool,
      elements,
      selectedIds,
      zoom,
      screenToCanvas,
      canvasToScreen,
      textEditorStyle,
      selectedElementsList,
      commitSelectedElements,
      commitCreatedElement,
      saveSelectedElementEdit,
      clearSelection,
      setSelectedElements,
      setSelectedTool,
      renderSceneAndSelection,
      renderSelection,
    };
  }

  function normalizeElement(el: SketchElement): SketchElement {
    return geometry.normalizeElement(el);
  }

  function applyResize(
    el: SketchElement,
    handle: number,
    to: Point,
  ): SketchElement {
    return geometry.applyResizeWithTextMeasurement({
      element: el,
      handle,
      to,
      allElements: [...elements.current],
      zoom: zoom.current,
      fontFamily,
      fontSize,
      fontWeight,
    });
  }

  function findBindableShape(
    point: Point,
    exclude: Set<string> = new Set(),
  ): { shape: SketchElement; anchor: AnchorSide } | null {
    return geometry.findBindableShape(
      point,
      [...elements.current],
      zoom.current,
      exclude,
    );
  }

  function syncBoundArrows(shapeIds: Set<string>, list: SketchElement[]) {
    return geometry.syncBoundArrows(shapeIds, list, [...elements.current]);
  }

  function commitSelectedElementSnapshot({ render = false } = {}) {
    setSelectedElements(selectedElementsList().map(normalizeElement));
    pushHistorySnapshot([...elements.current]);
    if (render) renderSelection();
  }

  function selectControllerContext(): SelectControllerContext {
    return {
      elements,
      selectedIds,
      selectionMarquee,
      selectInteraction,
      hoveredAnchor,
      zoom,
      screenToCanvas,
      selectedElementsList,
      setSelectedElements,
      setSelectedTool,
      syncToolbarStyleFromElement,
      clearSelection,
      applyResize,
      syncBoundArrows,
      findBindableShape,
      commitSelectedElementSnapshot,
      renderSceneAndSelection,
      renderSelection,
      scheduleSelectionRender,
      scheduleSceneAndSelectionRender,
    };
  }

  function scribbleControllerContext(): ScribbleControllerContext {
    return {
      pendingScribbleIds,
      scribbleTimer,
      recognitionConfig: recognitionConfigRef,
      elements,
      strokeColor,
      fontFamily,
      fontWeight,
      setScribblePending,
      pushHistorySnapshot,
      renderScene,
    };
  }

  function queueScribble(id: string) {
    queueScribbleStroke(scribbleControllerContext(), id);
  }

  function drawingControllerContext(): DrawingControllerContext {
    return {
      // Drawing handlers early-return when tool === "select", so narrowing here is safe.
      tool: tool as Tool,
      style: { strokeColor, fillColor, fillStyle, strokeWidth },
      canvasInteraction,
      currentElement,
      hoveredAnchor,
      elements,
      interactionCanvas: interactionCavasRef,
      rafId,
      scribbleEnabled,
      queueScribble,
      findBindableShape,
      normalizeElement,
      commitCreatedElement,
      pushHistorySnapshot,
      renderActiveElement,
      renderScene,
      renderSceneAndSelection,
      scheduleActiveElementRender,
    };
  }

  function viewportControllerContext(): ViewportControllerContext {
    return {
      tool,
      canvasInteraction,
      panOffset,
      zoom,
      elements,
      isPanning,
      selectedElementsList,
      screenToCanvas,
      setZoomLevel,
      scheduleViewportRender,
    };
  }

  function canvasCommandsContext(): CanvasCommandsContext {
    return {
      elements,
      selectedIds,
      history,
      screenToCanvas,
      selectedElementsList,
      setSelectedElements,
      setHistoryStatus,
      clearSelection,
      renderScene,
      renderSceneAndSelection,
    };
  }

  function canvasEffectsContext(): CanvasEffectsContext {
    return {
      elements,
      recognitionConfig: recognitionConfigRef,
      selectedElementsList,
      setStrokeColor,
      setIsBeautifying,
      syncBoundArrows,
      pushHistorySnapshot,
      renderSceneAndSelection,
    };
  }

  function onPointerDown(screenPoint: Point, e: React.PointerEvent) {
    if (tool === "select" && e.button === 2) return;
    if (isPanning.current) {
      return beginPanning(viewportControllerContext(), screenPoint);
    }

    const point = screenToCanvas(screenPoint);
    if (tool === "text") {
      return startTextControllerCreation(
        textControllerContext(),
        screenPoint,
        point,
      );
    }

    if (tool !== "select" && selectedIds.current.size > 0) {
      commitSelectedElements();
    }

    if (tool === "select") {
      return handleSelectControllerPointerDown(
        selectControllerContext(),
        point,
        e.shiftKey,
      );
    }
    startDrawingController(drawingControllerContext(), point);
  }

  function onPointerMove(screenPoint: Point) {
    if (handlePanningMove(viewportControllerContext(), screenPoint)) return;
    if (
      tool === "select" &&
      handleSelectControllerPointerMove(selectControllerContext(), screenPoint)
    )
      return;
    const point = screenToCanvas(screenPoint);
    const drawingCtx = drawingControllerContext();
    if (updateControllerArrowHover(drawingCtx, point)) return;
    handleDrawingControllerPointerMove(drawingCtx, point);
  }

  async function finalizeElement() {
    if (canvasInteraction.current.type === "panning") {
      canvasInteraction.current = { type: "idle" };
      return;
    }

    if (tool === "select") {
      return finalizeSelectControllerInteraction(selectControllerContext());
    }
    finalizeDrawingControllerInteraction(drawingControllerContext());
  }

  function handleZoom(delta: number, cursorScreen: Point) {
    zoomViewport({
      ctx: viewportControllerContext(),
      cursorScreen,
      delta,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
  }

  function onPan(dx: number, dy: number) {
    panViewport(viewportControllerContext(), dx, dy);
  }

  function getCursorForPoint(screenPoint: Point): string {
    return getViewportCursorForPoint(viewportControllerContext(), screenPoint);
  }

  function handleDrop(e: DragEvent, point: Point) {
    handleImageDrop(canvasCommandsContext(), e, point);
  }

  function onDoubleClick(screenPoint: Point) {
    handleTextDoubleClick(textControllerContext(), screenPoint);
  }

  function editSelected() {
    editSelectedText(textControllerContext());
  }

  function undo() {
    undoCanvas(canvasCommandsContext());
  }

  function redo() {
    redoCanvas(canvasCommandsContext());
  }

  function deleteSelected() {
    deleteSelectedElements(canvasCommandsContext());
  }

  function duplicateSelected() {
    duplicateSelectedElements(canvasCommandsContext(), DUPLICATE_OFFSET);
  }

  function deselect() {
    deselectCanvas(canvasCommandsContext());
  }

  function stopPanning() {
    isPanning.current = false;
    if (canvasInteraction.current.type === "panning") {
      canvasInteraction.current = { type: "idle" };
    }
  }

  function setElements(newElements: SketchElement[]) {
    replaceCanvasElements(canvasCommandsContext(), newElements);
  }

  return {
    elements,
    setElements,
    tool,

    setTool: (nextTool: ActiveTool) =>
      applyControllerTool(toolStyleControllerContext(), nextTool),
    strokeColor,
    setStrokeColor: (color: string) =>
      applyControllerStrokeColor(toolStyleControllerContext(), color),
    fillColor,
    setFillColor: (color: string) =>
      applyControllerFillColor(toolStyleControllerContext(), color),
    fillStyle,
    setFillStyle: (style: FillStyle) =>
      applyControllerFillStyle(toolStyleControllerContext(), style),
    strokeWidth,
    setStrokeWidth: (width: number) =>
      applyControllerStrokeWidth(toolStyleControllerContext(), width),
    selectedTool,
    fontFamily,
    setFontFamily: (font: string) =>
      applyControllerFontFamily(toolStyleControllerContext(), font),
    fontSize,
    setFontSize: (size: number) =>
      applyControllerFontSize(toolStyleControllerContext(), size),
    fontWeight,
    setFontWeight: (weight: "normal" | "bold") =>
      applyControllerFontWeight(toolStyleControllerContext(), weight),
    textAlign,
    setTextAlign: (align: "left" | "center" | "right") =>
      applyControllerTextAlign(toolStyleControllerContext(), align),
    textVerticalAlign,
    setTextVerticalAlign: (align: "top" | "middle" | "bottom") =>
      applyControllerTextVerticalAlign(toolStyleControllerContext(), align),
    applyThemeColors: (
      isDark: boolean,
      options?: { recordHistory?: boolean },
    ) => applyControllerThemeColors(canvasEffectsContext(), isDark, options),
    beautifyLayout: () => beautifyControllerLayout(canvasEffectsContext()),
    isBeautifying,
    zoomLevel,
    panOffsetDisplay,
    onPointerDown,
    onPointerMove,
    finalizeElement,
    handleZoom,
    isPanningRef: isPanning,
    stopPanning,
    undo,
    redo,
    canUndo: historyStatus.canUndo,
    canRedo: historyStatus.canRedo,
    deleteSelected,
    duplicateSelected,
    deselect,
    getCursorForPoint,
    handleDrop,
    onDoubleClick,
    editSelected,
    renderScene,
    renderSelection,
    onPan,
    scribbleEnabled,
    setScribbleEnabled,
    scribblePending,
    recognitionBackend,
    setRecognitionBackend,
    recognitionApiKey,
    setRecognitionApiKey,
  };
}
