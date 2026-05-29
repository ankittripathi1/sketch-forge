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
import {
  addToSelection,
  getSelectedElements,
  setSelection,
  toggleSelection,
} from "./lib/selectionModel";
import {
  panByOffset,
  panByPointerMove,
  zoomAroundScreenPoint,
} from "./lib/viewport";
import { buildTextElement, applyTextEdit } from "./tools/text";
import {
  createSelectionMarquee,
  findHitElement,
  findHitSelectedElement,
  findSingleSelectionHandle,
  getMarqueeSelectedIds,
  isPointInsideSelectionBounds,
  moveSelectedElements,
  updateSelectionMarquee,
  type SelectionMarquee,
  type SelectInteraction,
} from "./tools/select";
import { createRenderers } from "./lib/rendering";
import { useCanvasUI } from "./store";
import {
  bindArrowEnd,
  buildDraftElement,
  eraseIntersectingElements,
  isStrokeDraft,
  updateDraftElement,
} from "./tools/drawing";

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

type CanvasInteraction =
  | { type: "idle" }
  | { type: "drawing" }
  | { type: "panning"; lastScreenPoint: Point };

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
    selectedIds,
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

  function selectedElementsList() {
    return getSelectedElements(elements.current, selectedIds.current);
  }

  function setSelectedElements(next: SketchElement[]) {
    const nextIds = new Set(next.map((el) => el.id));
    const nextById = new Map(next.map((el) => [el.id, el]));
    const existingIds = new Set(elements.current.map((el) => el.id));

    elements.current = [
      ...elements.current.map((el) => nextById.get(el.id) ?? el),
      ...next.filter((el) => !existingIds.has(el.id)),
    ];
    selectedIds.current = nextIds;
  }

  function clearSelection() {
    selectedIds.current = new Set();
    setSelectedTool(null);
  }

  function commitSelectedElements() {
    if (selectedIds.current.size === 0) return;
    selectedIds.current = new Set();
    setSelectedTool(null);
    renderScene();
    renderSelection();
  }

  function updateSelectedElements(updates: Partial<SketchElement>) {
    if (selectedIds.current.size === 0) return;
    elements.current = elements.current.map((el) =>
      selectedIds.current.has(el.id)
        ? {
            ...el,
            ...updates,
          }
        : el,
    );
    history.current.push([...elements.current]);
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
      history.current.push([...elements.current]);
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
      selectedElementsList(),
      isDark,
    );
    setStrokeColor(result.newDefaultStroke);
    elements.current = result.elements.map(
      (el) => result.selected.find((selected) => selected.id === el.id) ?? el,
    );
    if (result.changed && options.recordHistory !== false) {
      history.current.push([...elements.current]);
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

  function onPointerDown(screenPoint: Point, e: React.PointerEvent) {
    if (tool === "select" && e.button === 2) return;

    if (isPanning.current) {
      canvasInteraction.current = {
        type: "panning",
        lastScreenPoint: screenPoint,
      };
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
        setSelectedElements([el]);
        setSelectedTool("text");
        history.current.push([...elements.current]);
        syncHistoryStatus();
        setTool("select");
        renderScene();
        renderSelection();
      });
      return;
    }

    if (tool !== "select" && selectedIds.current.size > 0) {
      commitSelectedElements();
    }

    if (tool === "select") {
      const selected = selectedElementsList();
      if (selected.length > 1 && !e.shiftKey) {
        const hitSelected = findHitSelectedElement(
          selected,
          point,
          8 / zoom.current,
        );
        const hitGroupBounds = isPointInsideSelectionBounds(
          selected,
          point,
          8 / zoom.current,
        );
        if (hitSelected || hitGroupBounds) {
          selectInteraction.current = {
            type: "dragging",
            lastPoint: point,
            moved: false,
          };
          return;
        }
      }

      if (selected.length === 1) {
        const handle = findSingleSelectionHandle(
          selected,
          point,
          6 / zoom.current,
          zoom.current,
          [...elements.current],
        );
        if (handle !== null) {
          selectInteraction.current = {
            type: "resizing",
            handle,
            origin: { ...selected[0]! },
            moved: false,
          };
          return;
        }
      }

      const hit = findHitElement(elements.current, point, 8 / zoom.current);
      if (hit) {
        if (e.shiftKey) {
          selectedIds.current = toggleSelection(selectedIds.current, hit.id);
          setSelectedTool(null);
          renderScene();
          renderSelection();
          return;
        }

        setSelectedElements([hit]);
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
        selectInteraction.current = {
          type: "dragging",
          lastPoint: point,
          moved: false,
        };
        renderScene();
        renderSelection();
        return;
      }

      if (selected.length > 0) {
        if (!isPointInsideSelectionBounds(selected, point, 8 / zoom.current)) {
          clearSelection();
          renderScene();
          renderSelection();
        }
        return;
      }

      selectionMarquee.current = createSelectionMarquee(point);
      selectInteraction.current = { type: "marquee", additive: e.shiftKey };
      renderSelection();
      return;
    }

    canvasInteraction.current = { type: "drawing" };
    let startBinding: ArrowBinding | undefined;
    let startPoint = point;
    if (tool === "arrow") {
      const target = findBindableShape(point);
      if (target) {
        startBinding = { elementId: target.shape.id, anchor: target.anchor };
        startPoint = getAnchorPoint(target.shape, target.anchor);
      }
    }
    currentElement.current = buildDraftElement({
      tool,
      point,
      style: { strokeColor, fillColor, fillStyle, strokeWidth },
      startBinding,
      startPoint,
    });
    renderActiveElement();
  }

  function onPointerMove(screenPoint: Point) {
    if (canvasInteraction.current.type === "panning") {
      const interaction = canvasInteraction.current;
      panOffset.current = panByPointerMove(
        panOffset.current,
        interaction.lastScreenPoint,
        screenPoint,
      );
      canvasInteraction.current = {
        type: "panning",
        lastScreenPoint: screenPoint,
      };
      scheduleViewportRender();
      return;
    }

    if (
      tool === "select" &&
      selectInteraction.current.type === "marquee" &&
      selectionMarquee.current
    ) {
      const point = screenToCanvas(screenPoint);
      selectionMarquee.current = updateSelectionMarquee(
        selectionMarquee.current,
        point,
      );
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(renderSelection);
      return;
    }

    if (
      tool === "select" &&
      selectInteraction.current.type === "resizing" &&
      selectedIds.current.size === 1 &&
      selectInteraction.current.origin
    ) {
      const interaction = selectInteraction.current;
      const point = screenToCanvas(screenPoint);
      const updated = applyResize(interaction.origin, interaction.handle, point);
      selectInteraction.current = { ...interaction, moved: true };
      setSelectedElements([updated]);
      const movedIds = new Set([updated.id]);
      elements.current = syncBoundArrows(movedIds, elements.current);

      // Anchor-snap hint while dragging an arrow endpoint handle.
      if (
        updated.tool === "arrow" &&
        (interaction.handle === 0 || interaction.handle === 2)
      ) {
        const exclude = new Set<string>([updated.id]);
        const other =
          interaction.handle === 0
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
      selectInteraction.current.type === "dragging" &&
      selectedIds.current.size > 0
    ) {
      const interaction = selectInteraction.current;
      const point = screenToCanvas(screenPoint);
      const dx = point.x - interaction.lastPoint.x;
      const dy = point.y - interaction.lastPoint.y;
      if (dx === 0 && dy === 0) return;

      selectInteraction.current = {
        ...interaction,
        lastPoint: point,
        moved: true,
      };

      elements.current = moveSelectedElements(
        elements.current,
        selectedIds.current,
        dx,
        dy,
      );

      // Drag bound arrows along with their target shapes.
      const movedIds = new Set(selectedIds.current);
      if (movedIds.size > 0) {
        elements.current = syncBoundArrows(movedIds, elements.current);
      }

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        renderScene();
        renderSelection();
      });
      return;
    }

    // Hover-only anchor preview when the arrow tool is active but no draw in progress.
    if (tool === "arrow" && canvasInteraction.current.type !== "drawing") {
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

    if (
      canvasInteraction.current.type !== "drawing" ||
      !currentElement.current
    )
      return;
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

    currentElement.current = updateDraftElement(currentElement.current, point, {
      x: endX,
      y: endY,
    });
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(renderActiveElement);
  }

  async function finalizeElement() {
    if (canvasInteraction.current.type === "panning") {
      canvasInteraction.current = { type: "idle" };
      return;
    }

    if (tool === "select") {
      const interaction = selectInteraction.current;

      if (interaction.type === "marquee" && selectionMarquee.current) {
        const ids = getMarqueeSelectedIds(
          elements.current,
          selectionMarquee.current,
        );
        if (ids.length > 0) {
          selectedIds.current = interaction.additive
            ? addToSelection(selectedIds.current, ids)
            : setSelection(ids);
        } else if (!interaction.additive) {
          selectedIds.current = setSelection([]);
          setSelectedTool(null);
        }
        selectInteraction.current = { type: "idle" };
        selectionMarquee.current = null;
        renderScene();
        renderSelection();
        return;
      }

      if (interaction.type === "resizing") {
        selectInteraction.current = { type: "idle" };
        hoveredAnchor.current = null;
        if (interaction.moved && selectedIds.current.size > 0) {
          setSelectedElements(selectedElementsList().map(normalizeElement));
          history.current.push([...elements.current]);
          syncHistoryStatus();
        }
        return;
      }

      if (interaction.type === "dragging") {
        selectInteraction.current = { type: "idle" };
        if (!interaction.moved || selectedIds.current.size === 0) return;
        setSelectedElements(selectedElementsList().map(normalizeElement));
        history.current.push([...elements.current]);
        syncHistoryStatus();
        renderSelection();
        return;
      }

      selectInteraction.current = { type: "idle" };
      return;
    }

    if (
      canvasInteraction.current.type !== "drawing" ||
      !currentElement.current
    )
      return;
    canvasInteraction.current = { type: "idle" };
    cancelAnimationFrame(rafId.current);

    if (tool === "eraser") {
      elements.current = eraseIntersectingElements(
        elements.current,
        currentElement.current,
      );
      currentElement.current = null;
      history.current.push(elements.current);
      syncHistoryStatus();
      renderScene();
      renderSelection();
      return;
    }

    let justCreated = normalizeElement(currentElement.current!);
    currentElement.current = null;
    hoveredAnchor.current = null;

    justCreated = bindArrowEnd(justCreated, findBindableShape);

    if (isStrokeDraft(tool)) {
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

    setSelectedElements([justCreated]);
    setSelectedTool(justCreated.tool);
    history.current.push([...elements.current]);
    syncHistoryStatus();
    setTool("select");
    renderScene();
    renderSelection();
  }

  function handleZoom(delta: number, cursorScreen: Point) {
    const next = zoomAroundScreenPoint({
      currentZoom: zoom.current,
      panOffset: panOffset.current,
      cursorScreen,
      delta,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
    zoom.current = next.zoom;
    setZoomLevel(Math.round(next.zoom * 100));
    panOffset.current = next.panOffset;
    scheduleViewportRender();
  }

  function onPan(dx: number, dy: number) {
    panOffset.current = panByOffset(panOffset.current, dx, dy);
    scheduleViewportRender();
  }

  function getCursorForPoint(screenPoint: Point): string {
    if (isPanning.current) return "grab";

    if (tool === "select") {
      const point = screenToCanvas(screenPoint);

      const selected = selectedElementsList();
      if (selected.length === 1) {
        const handle = hitTestHandle(
          selected[0]!,
          point,
          6 / zoom.current,
          zoom.current,
          [...elements.current],
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
        setSelectedElements([el]);
        setSelectedTool("text");
        history.current.push([...elements.current]);
        syncHistoryStatus();
        setTool("select");
        renderScene();
        renderSelection();
      });
      return;
    }

    if (tool === "select") {
      const point = screenToCanvas(screenPoint);
      const hit = [...elements.current]
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
        if (!selectedIds.current.has(hit.id)) {
          setSelectedElements([hit]);
          setSelectedTool(hit.tool);
          renderScene();
          renderSelection();
        }
        editSelected();
      }
    }
  }

  function editSelected() {
    const selected = selectedElementsList();
    if (selected.length !== 1) return;
    const el = selected[0]!;
    if (el.tool === "text") {
      const screenPos = canvasToScreen({ x: el.x1, y: el.y1 });
      const w = Math.abs(el.x2 - el.x1);
      clearSelection();
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
          setSelectedElements([el]);
          setSelectedTool(el.tool);
          renderSelection();
          return;
        }
        const updated = applyTextEdit(el, result);
        setSelectedElements([updated]);
        history.current.push([...elements.current]);
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
      setSelectedElements([{ ...el, text: undefined }]);
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
          setSelectedElements([el]);
          setSelectedTool(el.tool);
          renderSelection();
          return;
        }
        const updated = { ...el, text: result.text.trim() || undefined };
        setSelectedElements([updated]);
        history.current.push([...elements.current]);
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
      clearSelection();
      syncHistoryStatus();
      renderScene();
      renderSelection();
    }
  }

  function redo() {
    const snapshot = history.current.redo();
    if (snapshot) {
      elements.current = snapshot;
      clearSelection();
      syncHistoryStatus();
      renderScene();
      renderSelection();
    }
  }

  function deleteSelected() {
    if (selectedIds.current.size === 0) return;
    elements.current = elements.current.filter(
      (el) => !selectedIds.current.has(el.id),
    );
    clearSelection();
    history.current.push([...elements.current]);
    syncHistoryStatus();
    renderScene();
    renderSelection();
  }

  function duplicateSelected() {
    const originals = selectedElementsList();
    if (originals.length === 0) return;
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

    elements.current = [...elements.current, ...duplicates];
    setSelectedElements(duplicates);
    history.current.push([...elements.current]);
    syncHistoryStatus();
    renderScene();
    renderSelection();
  }

  function deselect() {
    clearSelection();
    renderScene();
    renderSelection();
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
