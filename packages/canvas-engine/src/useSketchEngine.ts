"use client";

import { RefObject, useRef, useState } from "react";
import { SketchElement, Point, Tool, FillStyle } from "@repo/canvas-core/types";
import type { AnchorSide } from "@repo/canvas-core/types";
import { createHistory } from "@repo/canvas-core/history";
import { getBoundingBox } from "@repo/canvas-core/hitDetection";
import {
  recognizeHandwriting,
  debounceForBackend,
  type RecognitionConfig,
} from "@repo/canvas-core/lib/recognition";
import { getAILayout } from "@repo/canvas-core/lib/layoutAI";
import { measureTextBox } from "@repo/canvas-core/textEditor";
import * as transforms from "./lib/transform";
import * as geometry from "./lib/geometry";
import { recolorByTheme } from "./lib/theme";
import {
  getToolbarStyleFromElement,
  getToolTransitionStyle,
  type ToolbarStyle,
} from "./lib/toolStyle";
import { buildTextFromStrokes } from "./lib/scribble";
import { applyLayoutUpdates } from "./lib/beautify";
import {
  pushHistorySnapshot as pushSnapshotToHistory,
  redoHistory,
  undoHistory,
} from "./lib/historyModel";
import {
  deleteElementsByIds,
  duplicateElements,
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
import { buildImageElement } from "./tools/image";
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
  const [tool, setTool] = useState<Tool>("rectangle");
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
   * flushScribbleBatch and beautifyLayout are async functions launched from
   * setTimeout callbacks and event handlers. By the time they run, the React
   * closure that created them may be stale — they'd read the old state values.
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
   * and cleared when flushScribbleBatch fires.
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
    return transforms.screenToCanvas(point, zoom.current, panOffset.current);
  }

  /**
   * Inverse of screenToCanvas.  Used when positioning the floating text
   * editor textarea over an existing text element.
   */
  function canvasToScreen(point: Point): Point {
    return transforms.canvasToScreen(point, zoom.current, panOffset.current);
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

  /**
   * Flushes the accumulated scribble batch: runs recognition on all strokes
   * drawn since the debounce timer last reset, and on success replaces the
   * raw ink with a text element positioned at the same bounding box.
   *
   * Flow:
   *   1. Drain pendingScribbleIds and look up the corresponding elements.
   *   2. Extract each element's point array and pass them all together to
   *      recognizeHandwriting — rendering them as one combined image gives
   *      the recogniser full word context instead of isolated letters.
   *   3. If the recogniser returns non-empty text:
   *        a. Remove the raw stroke elements from elements.current.
   *        b. Create a text element whose position spans the combined bbox
   *           and whose fontSize is proportional to the stroke height.
   *        c. Push a history snapshot so the conversion is undoable.
   *   4. If the recogniser returns "" (failed / noise), the strokes are
   *      left in place — the user can delete them manually or try again.
   *
   * scribblePending stays true for the ENTIRE duration (debounce + API call)
   * and is cleared in the finally block regardless of success or failure.
   */
  async function flushScribbleBatch() {
    const ids = new Set(pendingScribbleIds.current);
    pendingScribbleIds.current = [];

    // Nothing to process — clear the badge and return early.
    if (!ids.size) {
      setScribblePending(false);
      return;
    }

    try {
      // Locate the freehand stroke elements that belong to this batch.
      // We filter by tool to avoid accidentally matching text elements that
      // might have been given an id matching a pending scribble id (unlikely
      // but defensive).
      const strokeEls = elements.current.filter(
        (el) => el.tool === "freehand" && ids.has(el.id),
      );
      if (!strokeEls.length) return;

      // Each element's points array is one continuous ink stroke.  Filter
      // out strokes with fewer than 3 points (stray taps / near-zero lines).
      const strokes = strokeEls
        .map((el) => el.points ?? [])
        .filter((pts) => pts.length >= 3);

      if (!strokes.length) return;

      const text = await recognizeHandwriting(
        strokes,
        recognitionConfigRef.current,
      );

      const textEl = buildTextFromStrokes(strokes, text, {
        strokeColor,
        fontFamily,
        fontWeight,
      });
      if (!textEl) return;

      elements.current = elements.current.filter((el) => !ids.has(el.id));
      elements.current = [...elements.current, textEl];
      pushHistorySnapshot();
      renderScene();
    } finally {
      // Always clear the pending flag — even if recognition throws or returns
      // empty — so the badge doesn't get stuck in the "recognizing" state.
      setScribblePending(false);
    }
  }

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

  function applyStrokeColor(color: string) {
    setStrokeColor(color);
    updateSelectedElements({ strokeColor: color });
  }

  function applyFillColor(color: string) {
    setFillColor(color);
    updateSelectedElements({ fillColor: color });
  }

  function applyFillStyle(style: FillStyle) {
    setFillStyle(style);
    updateSelectedElements({ fillStyle: style });
  }

  function applyStrokeWidth(width: number) {
    setStrokeWidth(width);
    updateSelectedElements({ strokeWidth: width });
  }

  function applyFontFamily(font: string) {
    setFontFamily(font);
    updateSelectedElements({ fontFamily: font });
  }

  function applyFontSize(size: number) {
    setFontSize(size);
    updateSelectedElements({ fontSize: size });
  }

  function applyFontWeight(weight: "normal" | "bold") {
    setFontWeight(weight);
    updateSelectedElements({ fontWeight: weight });
  }

  function applyTextAlign(align: "left" | "center" | "right") {
    setTextAlign(align);
    updateSelectedElements({ textAlign: align });
  }

  function applyTextVerticalAlign(v: "top" | "middle" | "bottom") {
    setTextVerticalAlign(v);
    updateSelectedElements({ textVerticalAlign: v });
  }

  /**
   * Swap every element whose strokeColor is the "opposite" theme default to
   * the new theme default.  Elements with custom colours are left untouched.
   * A single history snapshot is created only when at least one element changed.
   */
  /**
   * Beautify: sends every element on the canvas to Gemini and applies the
   * returned layout plan as a single atomic, fully undoable operation.
   *
   * Implementation steps:
   *   1. Read the Gemini API key from the config ref (set in Settings).
   *   2. Read elements.current directly; selected state is tracked separately
   *      by id, so the element list is always the complete canvas.
   *   3. Call getAILayout() which serialises the elements, calls Gemini, and
   *      returns validated LayoutUpdate objects (see layoutAI.ts).
   *   4. Build an id → update map for O(1) lookups, then map both element
   *      arrays through an `apply` function that merges coordinates and, for
   *      text elements only, updated font properties.
   *      Non-text properties (fontSize, fontWeight, text) are intentionally
   *      gated on `el.tool === "text"` to avoid mutating shapes accidentally.
   *   5. Push the new state as a history snapshot → ⌘Z reverts the whole
   *      beautify in one step.
   *
   * @throws If no API key is configured (caught and alerted in handleBeautify).
   * @throws On network or JSON parsing errors from getAILayout.
   */
  async function beautifyLayout() {
    const apiKey = recognitionConfigRef.current.apiKey?.trim();
    if (!apiKey) {
      // Surface a clear error — the toolbar button is disabled when no key is
      // set, but this guard handles programmatic calls.
      throw new Error("A Gemini API key is required. Add it in Settings.");
    }

    const allElements = [...elements.current];
    if (!allElements.length) return;

    setIsBeautifying(true);
    try {
      const updates = await getAILayout(allElements, apiKey);

      // If Gemini returned nothing usable (e.g. empty canvas, API error),
      // bail out without touching elements or history.
      if (!updates.length) return;

      const updateMap = new Map(updates.map((u) => [u.id, u]));
      elements.current = applyLayoutUpdates(elements.current, updateMap);

      // Any arrow bound to a shape that just moved should follow it. We pass
      // the full id set so all bindings get re-resolved against the new positions.
      const allIds = new Set(elements.current.map((e) => e.id));
      elements.current = syncBoundArrows(allIds, elements.current);

      // Commit as one history entry so ⌘Z undoes the entire beautify at once.
      pushHistorySnapshot([...elements.current]);
      renderSceneAndSelection();
    } finally {
      // Always clear the loading state, whether the call succeeded or threw.
      setIsBeautifying(false);
    }
  }

  /**
   * Recolours every element that uses the previous theme's default stroke to
   * the new theme's default stroke, then resets the toolbar stroke to match.
   *
   * Only elements whose strokeColor exactly matches one of the two canonical
   * defaults (DEFAULT_LIGHT_STROKE / DEFAULT_DARK_STROKE) are affected.
   * Elements with custom colours (reds, blues, user-picked hex values, etc.)
   * are left untouched — this is the intentional "smart switch" behaviour:
   * the theme system manages its own defaults without clobbering user choices.
   *
   * A history snapshot is pushed only when at least one element actually
   * changed, so switching between two themes of the same polarity (e.g.
   * Midnight → Forest, both dark) produces no phantom undo entry.
   *
   * @param isDark  true when switching TO a dark theme, false for light.
   */
  function applyThemeColors(
    isDark: boolean,
    options: { recordHistory?: boolean } = {},
  ) {
    const result = recolorByTheme(
      elements.current,
      selectedElementsList(),
      isDark,
    );
    setStrokeColor(result.newDefaultStroke);
    elements.current = result.elements.map(
      (el) => result.selected.find((selected) => selected.id === el.id) ?? el,
    );
    if (result.changed && options.recordHistory !== false) {
      pushHistorySnapshot([...elements.current]);
    }
    renderSceneAndSelection();
    return result.changed;
  }

  function applyTool(nextTool: Tool) {
    if (tool !== nextTool) {
      commitSelectedElements();
    }
    setTool(nextTool);
    const style = getToolTransitionStyle({
      currentTool: tool,
      nextTool,
      canvasMode,
    });
    if (style) applyToolbarStyle(style);
  }

  function applyToolbarStyle(style: ToolbarStyle) {
    setStrokeColor(style.strokeColor);
    setFillColor(style.fillColor);
    setFillStyle(style.fillStyle);
    setStrokeWidth(style.strokeWidth);
    if (style.fontFamily) setFontFamily(style.fontFamily);
    if (style.fontSize) setFontSize(style.fontSize);
    if (style.fontWeight) setFontWeight(style.fontWeight);
    if (style.textAlign) setTextAlign(style.textAlign);
    if (style.textVerticalAlign) setTextVerticalAlign(style.textVerticalAlign);
  }

  function syncToolbarStyleFromElement(element: SketchElement) {
    applyToolbarStyle(getToolbarStyleFromElement(element));
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
    return {
      strokeColor,
      fontFamily,
      fontSize,
      fontWeight,
      zoom: zoom.current,
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
    const resized = geometry.applyResize(
      el,
      handle,
      to,
      [...elements.current],
      zoom.current,
    );
    if (resized.tool !== "text" || !resized.text) return resized;

    const { x, y, w } = getBoundingBox(resized);
    const measured = measureTextBox(resized.text, {
      fontFamily: resized.fontFamily ?? fontFamily,
      fontSize: resized.fontSize ?? fontSize,
      fontWeight: resized.fontWeight ?? fontWeight,
      width: Math.max(w, 20),
      fixedWidth: true,
    });

    return {
      ...resized,
      x1: x,
      x2: x + Math.max(w, 20),
      y1: y,
      y2: y + measured.height,
    };
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

  function queueScribble(id: string) {
    pendingScribbleIds.current.push(id);
    setScribblePending(true);
    if (scribbleTimer.current) clearTimeout(scribbleTimer.current);
    const debounceMs = debounceForBackend(recognitionConfigRef.current.backend);
    scribbleTimer.current = setTimeout(() => {
      void flushScribbleBatch();
    }, debounceMs);
  }

  function drawingControllerContext(): DrawingControllerContext {
    return {
      tool,
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
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const file = files[0]!;
    if (!file.type.startsWith("image/")) return;

    const canvasPoint = screenToCanvas(point);
    const reader = new FileReader();
    reader.onload = () => {
      const el = buildImageElement(canvasPoint, reader.result as string);
      elements.current = [...elements.current, el];
      pushHistorySnapshot();
      renderScene();
    };
    reader.readAsDataURL(file);
  }

  function onDoubleClick(screenPoint: Point) {
    handleTextDoubleClick(textControllerContext(), screenPoint);
  }

  function editSelected() {
    editSelectedText(textControllerContext());
  }

  function undo() {
    const { snapshot, status } = undoHistory(history.current);
    setHistoryStatus(status);
    if (snapshot) {
      elements.current = snapshot;
      clearSelection();
      renderSceneAndSelection();
    }
  }

  function redo() {
    const { snapshot, status } = redoHistory(history.current);
    setHistoryStatus(status);
    if (snapshot) {
      elements.current = snapshot;
      clearSelection();
      renderSceneAndSelection();
    }
  }

  function deleteSelected() {
    if (selectedIds.current.size === 0) return;
    elements.current = deleteElementsByIds(
      elements.current,
      selectedIds.current,
    );
    clearSelection();
    pushHistorySnapshot([...elements.current]);
    renderSceneAndSelection();
  }

  function duplicateSelected() {
    const originals = selectedElementsList();
    if (originals.length === 0) return;
    const duplicates = duplicateElements(originals, DUPLICATE_OFFSET);

    elements.current = [...elements.current, ...duplicates];
    setSelectedElements(duplicates);
    pushHistorySnapshot([...elements.current]);
    renderSceneAndSelection();
  }

  function deselect() {
    clearSelection();
    renderSceneAndSelection();
  }

  function stopPanning() {
    isPanning.current = false;
    if (canvasInteraction.current.type === "panning") {
      canvasInteraction.current = { type: "idle" };
    }
  }

  function setElements(newElements: SketchElement[]) {
    elements.current = newElements;
    clearSelection();
    history.current = createHistory();
    pushHistorySnapshot(newElements);
    renderSceneAndSelection();
  }

  return {
    elements,
    setElements,
    tool,

    setTool: applyTool,
    strokeColor,
    setStrokeColor: applyStrokeColor,
    fillColor,
    setFillColor: applyFillColor,
    fillStyle,
    setFillStyle: applyFillStyle,
    strokeWidth,
    setStrokeWidth: applyStrokeWidth,
    selectedTool,
    fontFamily,
    setFontFamily: applyFontFamily,
    fontSize,
    setFontSize: applyFontSize,
    fontWeight,
    setFontWeight: applyFontWeight,
    textAlign,
    setTextAlign: applyTextAlign,
    textVerticalAlign,
    setTextVerticalAlign: applyTextVerticalAlign,
    applyThemeColors,
    beautifyLayout,
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
