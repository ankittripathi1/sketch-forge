"use client";

import { RefObject, useRef, useState } from "react";
import { SketchElement, Point, Tool, FillStyle } from "@repo/canvas-core/types";
import { getAnchorPoint } from "@repo/canvas-core/renderElement";
import type { ArrowBinding, AnchorSide } from "@repo/canvas-core/types";
import { createHistory } from "@repo/canvas-core/history";
import {
  hitTestElement,
  hitTestHandle,
  getBoundingBox,
  isElementInsideRect,
} from "@repo/canvas-core/hitDetection";
import {
  recognizeHandwriting,
  debounceForBackend,
  type RecognitionConfig,
} from "@repo/canvas-core/lib/recognition";
import { getAILayout } from "@repo/canvas-core/lib/layoutAI";
import { measureTextBox, openTextEditor } from "@repo/canvas-core/textEditor";
import {
  DEFAULT_DARK_STROKE,
  DEFAULT_LIGHT_STROKE,
} from "@repo/canvas-core/colorUtils";
import * as transforms from "./lib/transform";
import * as geometry from "./lib/geometry";
import { recolorByTheme } from "./lib/theme";
import { buildTextFromStrokes } from "./lib/scribble";
import { applyLayoutUpdates } from "./lib/beautify";
import { buildTextElement, applyTextEdit } from "./tools/text";
import { createRenderers } from "./lib/rendering";
import { useCanvasUI } from "./store";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 20;
const OFFSET = 24;

const HANDLE_CURSORS = [
  "nwse-resize",
  "ns-resize",
  "nesw-resize",
  "ew-resize",
  "ew-resize",
  "nesw-resize",
  "ns-resize",
  "nwse-resize",
];

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

  const selectedElements = useRef<SketchElement[]>([]);
  const selectionMarquee = useRef<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const isAddetiveSelection = useRef(false);
  const isDragging = useRef(false);
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  const resizeHandle = useRef<number | null>(null);
  const resizeOrigin = useRef<SketchElement | null>(null);
  const elements = useRef<SketchElement[]>([]);
  const currentElement = useRef<SketchElement | null>(null);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const isPanningDragging = useRef(false);
  const panStartPoint = useRef<Point>({ x: 0, y: 0 });
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

  function getDeviceScale(canvas: HTMLCanvasElement) {
    return transforms.getDeviceScale(canvas);
  }

  function clearCanvas(canvas: HTMLCanvasElement) {
    return transforms.clearCanvas(canvas);
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
    selectedElements,
    currentElement,
    hoveredAnchor,
    selectionMarquee,
    zoom,
    panOffset,
    viewportRafId,
    setPanOffsetDisplay,
  });
  const {
    renderScene,
    renderActiveElement,
    renderSelection,
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
      history.current.push(elements.current);
      syncHistoryStatus();
      renderScene();
    } finally {
      // Always clear the pending flag — even if recognition throws or returns
      // empty — so the badge doesn't get stuck in the "recognizing" state.
      setScribblePending(false);
    }
  }

  function syncHistoryStatus() {
    setHistoryStatus({
      canUndo: history.current.canUndo(),
      canRedo: history.current.canRedo(),
    });
  }

  function commitSelectedElements() {
    if (selectedElements.current.length === 0) return;
    elements.current = [...elements.current, ...selectedElements.current];
    selectedElements.current = [];
    setSelectedTool(null);
    renderScene();
    renderSelection();
  }

  function snapshotWithSelection(selection = selectedElements.current) {
    const selectedIds = new Set(selection.map((el) => el.id));
    return [
      ...elements.current.filter((el) => !selectedIds.has(el.id)),
      ...selection,
    ];
  }

  function updateSelectedElements(updates: Partial<SketchElement>) {
    if (selectedElements.current.length === 0) return;
    selectedElements.current = selectedElements.current.map((el) => ({
      ...el,
      ...updates,
    }));
    history.current.push(snapshotWithSelection());
    syncHistoryStatus();
    renderScene();
    renderSelection();
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
   *   2. Merge elements.current + selectedElements.current into one flat array.
   *      Selected elements live in a separate ref while selected; we need to
   *      include them so the model sees the full canvas, not just the unselected
   *      portion.
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

    // Combine both element stores into one list for the API call.
    // Elements in selectedElements.current are excluded from elements.current
    // (they're moved there when selected), so a union is necessary.
    const allElements = [...elements.current, ...selectedElements.current];
    if (!allElements.length) return;

    setIsBeautifying(true);
    try {
      const updates = await getAILayout(allElements, apiKey);

      // If Gemini returned nothing usable (e.g. empty canvas, API error),
      // bail out without touching elements or history.
      if (!updates.length) return;

      const updateMap = new Map(updates.map((u) => [u.id, u]));
      elements.current = applyLayoutUpdates(elements.current, updateMap);
      selectedElements.current = applyLayoutUpdates(
        selectedElements.current,
        updateMap,
      );

      // Any arrow bound to a shape that just moved should follow it. We pass
      // the full id set so all bindings get re-resolved against the new positions.
      const allIds = new Set([
        ...elements.current.map((e) => e.id),
        ...selectedElements.current.map((e) => e.id),
      ]);
      elements.current = syncBoundArrows(allIds, elements.current);
      selectedElements.current = syncBoundArrows(
        allIds,
        selectedElements.current,
      );

      // Commit as one history entry so ⌘Z undoes the entire beautify at once.
      history.current.push(snapshotWithSelection());
      syncHistoryStatus();
      renderScene();
      renderSelection();
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
      selectedElements.current,
      isDark,
    );
    setStrokeColor(result.newDefaultStroke);
    elements.current = result.elements;
    selectedElements.current = result.selected;
    if (result.changed && options.recordHistory !== false) {
      history.current.push(snapshotWithSelection());
      syncHistoryStatus();
    }
    renderScene();
    renderSelection();
    return result.changed;
  }

  function applyTool(nextTool: Tool) {
    if (tool !== nextTool) {
      commitSelectedElements();
    }
    setTool(nextTool);
    if (nextTool === "highlighter") {
      setStrokeColor("#f2d14f");
      setFillColor("none");
      setFillStyle("none");
      setStrokeWidth(18);
    } else if (tool === "highlighter") {
      setStrokeColor(
        canvasMode === "dark" ? DEFAULT_DARK_STROKE : DEFAULT_LIGHT_STROKE,
      );
      setFillColor("none");
      setFillStyle("none");
      setStrokeWidth(1.5);
    }
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
      [...elements.current, ...selectedElements.current],
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
      [...elements.current, ...selectedElements.current],
      zoom.current,
      exclude,
    );
  }

  function syncBoundArrows(shapeIds: Set<string>, list: SketchElement[]) {
    return geometry.syncBoundArrows(shapeIds, list, [
      ...elements.current,
      ...selectedElements.current,
    ]);
  }

  function onPointerDown(screenPoint: Point, e: React.PointerEvent) {
    if (tool === "select" && e.button === 2) return;

    if (isPanning.current) {
      isPanningDragging.current = true;
      panStartPoint.current = screenPoint;
      return;
    }

    const point = screenToCanvas(screenPoint);

    if (tool === "text") {
      const point = screenToCanvas(screenPoint);
      commitSelectedElements();
      openTextEditor({
        x: screenPoint.x,
        y: screenPoint.y,
        width: 20,
        fontFamily,
        fontSize,
        fontWeight,
        color: strokeColor,
        zoom: zoom.current,
      }).then((result) => {
        if (!result?.text.trim()) return;
        const el = buildTextElement(point, result, {
          strokeColor,
          fontFamily,
          fontSize,
          fontWeight,
        });
        selectedElements.current = [el];
        setSelectedTool("text");
        history.current.push([...elements.current, el]);
        syncHistoryStatus();
        setTool("select");
        renderScene();
        renderSelection();
      });
      return;
    }

    if (tool !== "select" && selectedElements.current.length > 0) {
      commitSelectedElements();
    }

    if (tool === "select" && selectedElements.current.length > 1) {
      const hitSelected = selectedElements.current
        .slice()
        .reverse()
        .find((el) => hitTestElement(el, point, 8 / zoom.current));
      if (hitSelected) {
        isDragging.current = true;
        dragStart.current = point;
        return;
      }
    }

    if (tool === "select") {
      if (selectedElements.current.length === 1) {
        const handle = hitTestHandle(
          selectedElements.current[0]!,
          point,
          6 / zoom.current,
          zoom.current,
          [...elements.current, ...selectedElements.current],
        );
        if (handle !== null) {
          resizeHandle.current = handle;
          resizeOrigin.current = { ...selectedElements.current[0]! };
          return;
        }
      }

      const hit = [...elements.current, ...selectedElements.current]
        .reverse()
        .find((el) => hitTestElement(el, point, 8 / zoom.current));
      if (hit) {
        // Commit previously selected elements back to scene before switching selection
        elements.current = [
          ...elements.current.filter((el) => el.id !== hit.id),
          ...selectedElements.current.filter((el) => el.id !== hit.id),
        ];
        selectedElements.current = [hit];
        setSelectedTool(hit.tool);
        setStrokeColor(hit.strokeColor);
        setFillColor(hit.fillColor);
        setFillStyle(hit.fillStyle);
        setStrokeWidth(hit.strokeWidth);
        if (hit.fontFamily) setFontFamily(hit.fontFamily);
        if (hit.fontSize) setFontSize(hit.fontSize);
        if (hit.fontWeight) setFontWeight(hit.fontWeight);
        if (hit.textAlign) setTextAlign(hit.textAlign);
        if (hit.textVerticalAlign) setTextVerticalAlign(hit.textVerticalAlign);
        isDragging.current = true;
        dragStart.current = point;
        renderScene();
        renderSelection();
        return;
      }

      if (selectedElements.current.length > 0) {
        const boxPoint = canvasToScreen(point);
        const el = selectedElements.current[0]!;
        const { x, y, w, h } = getBoundingBox(el);
        const sMin = canvasToScreen({ x, y });
        const sMax = canvasToScreen({ x: x + w, y: y + h });

        if (
          boxPoint.x < sMin.x ||
          boxPoint.x > sMax.x ||
          boxPoint.y < sMin.y ||
          boxPoint.y > sMax.y
        ) {
          elements.current = [...elements.current, ...selectedElements.current];
          selectedElements.current = [];
          setSelectedTool(null);
          renderScene();
          renderSelection();
        }
        return;
      }

      selectionMarquee.current = {
        x1: point.x,
        y1: point.y,
        x2: point.x,
        y2: point.y,
      };
      renderSelection();
      return;
    }

    isDrawing.current = true;
    let startBinding: ArrowBinding | undefined;
    let startX = point.x;
    let startY = point.y;
    if (tool === "arrow") {
      const target = findBindableShape(point);
      if (target) {
        startBinding = { elementId: target.shape.id, anchor: target.anchor };
        const p = getAnchorPoint(target.shape, target.anchor);
        startX = p.x;
        startY = p.y;
      }
    }
    currentElement.current = {
      id: crypto.randomUUID(),
      tool,
      seed: Math.floor(Math.random() * 100000),
      strokeColor,
      fillColor,
      fillStyle,
      strokeWidth,
      x1: startX,
      y1: startY,
      x2: point.x,
      y2: point.y,
      points:
        tool === "freehand" || tool === "highlighter" ? [point] : undefined,
      opacity: tool === "highlighter" ? 0.35 : undefined,
      startBinding,
    };
    renderActiveElement();
  }

  function onPointerMove(screenPoint: Point) {
    if (isPanning.current && isPanningDragging.current) {
      panOffset.current = {
        x: panOffset.current.x + (screenPoint.x - panStartPoint.current.x),
        y: panOffset.current.y + (screenPoint.y - panStartPoint.current.y),
      };
      panStartPoint.current = screenPoint;
      scheduleViewportRender();
      return;
    }

    if (tool === "select" && selectionMarquee.current) {
      const point = screenToCanvas(screenPoint);
      selectionMarquee.current = {
        ...selectionMarquee.current,
        x2: point.x,
        y2: point.y,
      };
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(renderSelection);
      return;
    }

    if (
      tool === "select" &&
      resizeHandle.current !== null &&
      selectedElements.current.length === 1 &&
      resizeOrigin.current
    ) {
      const point = screenToCanvas(screenPoint);
      const updated = applyResize(
        resizeOrigin.current,
        resizeHandle.current,
        point,
      );
      selectedElements.current = [updated];
      const movedIds = new Set([updated.id]);
      elements.current = syncBoundArrows(movedIds, elements.current);

      // Anchor-snap hint while dragging an arrow endpoint handle.
      if (
        updated.tool === "arrow" &&
        (resizeHandle.current === 0 || resizeHandle.current === 2)
      ) {
        const exclude = new Set<string>([updated.id]);
        const other =
          resizeHandle.current === 0
            ? updated.endBinding?.elementId
            : updated.startBinding?.elementId;
        if (other) exclude.add(other);
        const target = findBindableShape(point, exclude);
        hoveredAnchor.current = target
          ? { shape: target.shape, anchor: target.anchor }
          : null;
      } else {
        hoveredAnchor.current = null;
      }

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        renderScene();
        renderSelection();
      });
      return;
    }

    if (
      tool === "select" &&
      isDragging.current &&
      selectedElements.current.length > 0
    ) {
      const point = screenToCanvas(screenPoint);
      const dx = point.x - dragStart.current.x;
      const dy = point.y - dragStart.current.y;
      dragStart.current = point;

      selectedElements.current = selectedElements.current.map((el) => ({
        ...el,
        x1: el.x1 + dx,
        y1: el.y1 + dy,
        x2: el.x2 + dx,
        y2: el.y2 + dy,
        points: el.points?.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      }));

      // Drag bound arrows along with their target shapes.
      const movedIds = new Set(selectedElements.current.map((el) => el.id));
      if (movedIds.size > 0) {
        elements.current = syncBoundArrows(movedIds, elements.current);
        selectedElements.current = syncBoundArrows(
          movedIds,
          selectedElements.current,
        );
      }

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        renderScene();
        renderSelection();
      });
      return;
    }

    // Hover-only anchor preview when the arrow tool is active but no draw in progress.
    if (tool === "arrow" && !isDrawing.current) {
      const point = screenToCanvas(screenPoint);
      const target = findBindableShape(point);
      const next = target
        ? { shape: target.shape, anchor: target.anchor }
        : null;
      const prev = hoveredAnchor.current;
      const changed =
        (!prev && next) ||
        (prev && !next) ||
        (prev &&
          next &&
          (prev.shape.id !== next.shape.id || prev.anchor !== next.anchor));
      if (changed) {
        hoveredAnchor.current = next;
        cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(renderActiveElement);
      }
      return;
    }

    if (!isDrawing.current || !currentElement.current) return;
    const point = screenToCanvas(screenPoint);

    // While drawing an arrow, snap the live endpoint to the nearest anchor of
    // the shape under the cursor (excluding the start-bound shape).
    let endX = point.x;
    let endY = point.y;
    let hint: { shape: SketchElement; anchor: AnchorSide } | null = null;
    if (currentElement.current.tool === "arrow") {
      const exclude = new Set<string>();
      const sb = currentElement.current.startBinding;
      if (sb) exclude.add(sb.elementId);
      const target = findBindableShape(point, exclude);
      if (target) {
        const p = getAnchorPoint(target.shape, target.anchor);
        endX = p.x;
        endY = p.y;
        hint = { shape: target.shape, anchor: target.anchor };
      }
    }
    hoveredAnchor.current = hint;

    currentElement.current = {
      ...currentElement.current,
      x2: endX,
      y2: endY,
      points: currentElement.current.points
        ? [...currentElement.current.points, point]
        : undefined,
    };
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(renderActiveElement);
  }

  async function finalizeElement() {
    if (isPanning.current) {
      isPanningDragging.current = false;
      return;
    }

    if (tool === "select") {
      isAddetiveSelection.current = ed;
      if (selectionMarquee.current) {
        const { x1, y1, x2, y2 } = selectionMarquee.current;
        const newlySelected = elements.current.filter((el) =>
          isElementInsideRect(el, x1, y1, x2, y2),
        );
        if (newlySelected.length > 0) {
          selectedElements.current = [
            ...selectedElements.current,
            ...newlySelected,
          ];
          elements.current = elements.current.filter(
            (el) => !newlySelected.some((s) => s.id === el.id),
          );
        }
        selectionMarquee.current = null;
        renderScene();
        renderSelection();
        return;
      }

      if (resizeHandle.current !== null) {
        resizeHandle.current = null;
        resizeOrigin.current = null;
        hoveredAnchor.current = null;
        if (selectedElements.current.length > 0) {
          selectedElements.current =
            selectedElements.current.map(normalizeElement);
          history.current.push([
            ...elements.current,
            ...selectedElements.current,
          ]);
          syncHistoryStatus();
        }
        return;
      }

      isDragging.current = false;
      if (selectedElements.current.length > 0) {
        selectedElements.current =
          selectedElements.current.map(normalizeElement);
        history.current.push([
          ...elements.current,
          ...selectedElements.current,
        ]);
        syncHistoryStatus();
        renderSelection();
      }
      return;
    }

    if (!isDrawing.current || !currentElement.current) return;
    isDrawing.current = false;
    cancelAnimationFrame(rafId.current);

    if (tool === "eraser") {
      const eraser = currentElement.current;
      const minX = Math.min(eraser.x1, eraser.x2);
      const maxX = Math.max(eraser.x1, eraser.x2);
      const minY = Math.min(eraser.y1, eraser.y2);
      const maxY = Math.max(eraser.y1, eraser.y2);
      elements.current = elements.current.filter((el) => {
        const elMinX = Math.min(el.x1, el.x2);
        const elMaxX = Math.max(el.x1, el.x2);
        const elMinY = Math.min(el.y1, el.y2);
        const elMaxY = Math.max(el.y1, el.y2);
        return !(
          elMinX < maxX &&
          elMaxX > minX &&
          elMinY < maxY &&
          elMaxY > minY
        );
      });
      currentElement.current = null;
      history.current.push(elements.current);
      syncHistoryStatus();
      renderScene();
      renderSelection();
      return;
    }

    let justCreated = normalizeElement(currentElement.current!);
    isDrawing.current = false;
    currentElement.current = null;
    hoveredAnchor.current = null;

    if (justCreated.tool === "arrow") {
      const exclude = new Set<string>();
      if (justCreated.startBinding)
        exclude.add(justCreated.startBinding.elementId);
      const endTarget = findBindableShape(
        { x: justCreated.x2, y: justCreated.y2 },
        exclude,
      );
      if (endTarget) {
        const p = getAnchorPoint(endTarget.shape, endTarget.anchor);
        justCreated = {
          ...justCreated,
          x2: p.x,
          y2: p.y,
          endBinding: {
            elementId: endTarget.shape.id,
            anchor: endTarget.anchor,
          },
        };
      }
    }

    if (tool === "freehand" || tool === "highlighter") {
      elements.current = [...elements.current, justCreated];
      history.current.push(elements.current);
      syncHistoryStatus();
      renderScene();

      if (tool === "freehand" && scribbleEnabled) {
        pendingScribbleIds.current.push(justCreated.id);
        setScribblePending(true);
        if (scribbleTimer.current) clearTimeout(scribbleTimer.current);
        // Use a longer window for Tesseract — writers pause between letters
        // and 800 ms fires too early, splitting each letter into its own batch.
        const debounceMs = debounceForBackend(
          recognitionConfigRef.current.backend,
        );
        scribbleTimer.current = setTimeout(() => {
          void flushScribbleBatch();
        }, debounceMs);
      }

      const interactionCanvas = interactionCavasRef.current;
      if (interactionCanvas) clearCanvas(interactionCanvas);
      return;
    }

    selectedElements.current = [justCreated];
    setSelectedTool(justCreated.tool);
    history.current.push([...elements.current, justCreated]);
    syncHistoryStatus();
    setTool("select");
    renderScene();
    renderSelection();
  }

  function handleZoom(delta: number, cursorScreen: Point) {
    const newZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, zoom.current * (1 + delta)),
    );
    const cursorCanvas = screenToCanvas(cursorScreen);
    zoom.current = newZoom;
    setZoomLevel(Math.round(newZoom * 100));
    panOffset.current = {
      x: cursorScreen.x - cursorCanvas.x * newZoom,
      y: cursorScreen.y - cursorCanvas.y * newZoom,
    };
    scheduleViewportRender();
  }

  function onPan(dx: number, dy: number) {
    panOffset.current = {
      x: panOffset.current.x + dx,
      y: panOffset.current.y + dy,
    };
    scheduleViewportRender();
  }

  function getCursorForPoint(screenPoint: Point): string {
    if (isPanning.current) return "grab";

    if (tool === "select") {
      const point = screenToCanvas(screenPoint);

      if (selectedElements.current.length === 1) {
        const handle = hitTestHandle(
          selectedElements.current[0]!,
          point,
          6 / zoom.current,
          zoom.current,
          [...elements.current, ...selectedElements.current],
        );
        if (handle !== null) return HANDLE_CURSORS[handle] ?? "pointer";
      }

      for (let i = elements.current.length - 1; i >= 0; i--) {
        if (hitTestElement(elements.current[i]!, point, 8 / zoom.current))
          return "pointer";
      }
    }

    if (tool === "text") return "text";
    return "crosshair";
  }

  function handleDrop(e: DragEvent, point: Point) {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const file = files[0]!;
    if (!file.type.startsWith("image/")) return;

    const canvasPoint = screenToCanvas(point);
    const reader = new FileReader();
    reader.onload = () => {
      const el: SketchElement = {
        id: crypto.randomUUID(),
        tool: "image",
        seed: Math.floor(Math.random() * 100000),
        strokeColor: "#000000",
        fillColor: "none",
        fillStyle: "none",
        strokeWidth: 0,
        x1: canvasPoint.x,
        y1: canvasPoint.y,
        x2: canvasPoint.x + 200,
        y2: canvasPoint.y + 200,
        src: reader.result as string,
      };
      elements.current = [...elements.current, el];
      history.current.push(elements.current);
      syncHistoryStatus();
      renderScene();
    };
    reader.readAsDataURL(file);
  }

  function onDoubleClick(screenPoint: Point) {
    if (tool === "text") {
      const point = screenToCanvas(screenPoint);
      commitSelectedElements();
      openTextEditor({
        x: screenPoint.x,
        y: screenPoint.y,
        width: 20,
        fontFamily,
        fontSize,
        fontWeight,
        color: strokeColor,
        zoom: zoom.current,
      }).then((result) => {
        if (!result?.text.trim()) return;
        const el: SketchElement = {
          id: crypto.randomUUID(),
          tool: "text",
          seed: Math.floor(Math.random() * 100000),
          strokeColor,
          fillColor: "none",
          fillStyle: "none",
          strokeWidth: 0,
          x1: point.x,
          y1: point.y,
          x2: point.x + result.width,
          y2: point.y + result.height,
          text: result.text,
          fontFamily,
          fontSize,
          fontWeight,
        };
        selectedElements.current = [el];
        setSelectedTool("text");
        history.current.push([...elements.current, el]);
        syncHistoryStatus();
        setTool("select");
        renderScene();
        renderSelection();
      });
      return;
    }

    if (tool === "select") {
      const point = screenToCanvas(screenPoint);
      const hit = [...elements.current, ...selectedElements.current]
        .reverse()
        .find((el) => hitTestElement(el, point, 8 / zoom.current));
      const canEditText =
        hit &&
        (hit.tool === "text" ||
          (hit.tool !== "image" &&
            hit.tool !== "eraser" &&
            hit.tool !== "line" &&
            hit.tool !== "arrow" &&
            hit.tool !== "freehand" &&
            hit.tool !== "highlighter"));
      if (hit && canEditText) {
        if (!selectedElements.current.some((el) => el.id === hit.id)) {
          selectedElements.current = [hit];
          elements.current = elements.current.filter((el) => el.id !== hit.id);
          setSelectedTool(hit.tool);
          renderScene();
          renderSelection();
        }
        editSelected();
      }
    }
  }

  function editSelected() {
    if (selectedElements.current.length !== 1) return;
    const el = selectedElements.current[0]!;
    if (el.tool === "text") {
      const screenPos = canvasToScreen({ x: el.x1, y: el.y1 });
      const w = Math.abs(el.x2 - el.x1);
      selectedElements.current = [];
      renderScene();
      renderSelection();
      openTextEditor({
        currentText: el.text ?? "",
        x: screenPos.x,
        y: screenPos.y,
        width: w,
        fontFamily: el.fontFamily ?? fontFamily,
        fontSize: el.fontSize ?? fontSize,
        fontWeight: el.fontWeight ?? fontWeight,
        color: el.strokeColor,
        zoom: zoom.current,
        fixedWidth: true,
      }).then((result) => {
        if (result === null) {
          selectedElements.current = [el];
          setSelectedTool(el.tool);
          renderSelection();
          return;
        }
        const updated = applyTextEdit(el, result);
        selectedElements.current = [updated];
        elements.current = elements.current.map((e) =>
          e.id === el.id ? updated : e,
        );
        history.current.push(snapshotWithSelection([updated]));
        syncHistoryStatus();
        renderScene();
        renderSelection();
      });
    } else if (
      el.tool !== "image" &&
      el.tool !== "eraser" &&
      el.tool !== "line" &&
      el.tool !== "arrow" &&
      el.tool !== "freehand" &&
      el.tool !== "highlighter"
    ) {
      const { x, y, w } = getBoundingBox(el);
      const screenPos = canvasToScreen({ x, y });
      selectedElements.current = [{ ...el, text: undefined }];
      renderScene();
      renderSelection();
      openTextEditor({
        currentText: el.text ?? "",
        x: screenPos.x,
        y: screenPos.y,
        width: w,
        fontFamily: el.fontFamily ?? fontFamily,
        fontSize: el.fontSize ?? fontSize,
        fontWeight: el.fontWeight ?? fontWeight,
        color: el.strokeColor,
        zoom: zoom.current,
        fixedWidth: true,
        align: "center",
      }).then((result) => {
        if (result === null) {
          selectedElements.current = [el];
          setSelectedTool(el.tool);
          renderSelection();
          return;
        }
        const updated = { ...el, text: result.text.trim() || undefined };
        selectedElements.current = [updated];
        elements.current = elements.current.map((e) =>
          e.id === el.id ? updated : e,
        );
        history.current.push(snapshotWithSelection([updated]));
        syncHistoryStatus();
        renderScene();
        renderSelection();
      });
    }
  }

  function undo() {
    const snapshot = history.current.undo();
    if (snapshot) {
      elements.current = snapshot;
      selectedElements.current = [];
      setSelectedTool(null);
      syncHistoryStatus();
      renderScene();
      renderSelection();
    }
  }

  function redo() {
    const snapshot = history.current.redo();
    if (snapshot) {
      elements.current = snapshot;
      selectedElements.current = [];
      setSelectedTool(null);
      syncHistoryStatus();
      renderScene();
      renderSelection();
    }
  }

  function deleteSelected() {
    selectedElements.current = [];
    setSelectedTool(null);
    renderScene();
    renderSelection();
  }

  function duplicateSelected() {
    if (selectedElements.current.length === 0) return;
    const originals = selectedElements.current;
    const duplicates = originals.map((element) => ({
      ...element,
      id: crypto.randomUUID(),
      x1: element.x1 + OFFSET,
      y1: element.y1 + OFFSET,
      x2: element.x2 + OFFSET,
      y2: element.y2 + OFFSET,
      seed: Math.floor(Math.random() * 100_000),
      points: element.points?.map((point) => ({
        x: point.x + OFFSET,
        y: point.y + OFFSET,
      })),
    }));

    elements.current = [...elements.current, ...originals];
    selectedElements.current = duplicates;
    history.current.push(snapshotWithSelection());
    syncHistoryStatus();
    renderScene();
    renderSelection();
  }

  function deselect() {
    elements.current = [...elements.current, ...selectedElements.current];
    selectedElements.current = [];
    setSelectedTool(null);
    renderScene();
    renderSelection();
  }

  function stopPanning() {
    isPanning.current = false;
    isPanningDragging.current = false;
  }

  function setElements(newElements: SketchElement[]) {
    elements.current = newElements;
    selectedElements.current = [];
    history.current = createHistory();
    history.current.push(newElements);
    syncHistoryStatus();
    renderScene();
    renderSelection();
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
