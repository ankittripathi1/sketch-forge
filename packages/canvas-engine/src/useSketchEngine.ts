"use client";

import { RefObject, useRef, useState } from "react";
import rough from "roughjs";
import { SketchElement, Point, Tool, FillStyle } from "@repo/canvas-core/types";
import {
  drawElement,
  drawSelectionBox,
  drawAnchorHints,
  getAnchorPoint,
  getAllAnchorPoints,
  resolveArrowEndpoints,
  getArrowControlPoint,
} from "@repo/canvas-core/renderElement";
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
import { openTextEditor } from "@repo/canvas-core/textEditor";
import { openCodeEditor } from "@repo/canvas-core/codeEditor";
import {
  DEFAULT_DARK_STROKE,
  DEFAULT_LIGHT_STROKE,
} from "@repo/canvas-core/colorUtils";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 20;
const OFFSET = 24;
const CODE_MIN_WIDTH = 280;
type CodeLanguage = NonNullable<SketchElement["codeLanguage"]>;

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
) {
  const [tool, setTool] = useState<Tool>("rectangle");
  const [historyStatus, setHistoryStatus] = useState({
    canUndo: false,
    canRedo: false,
  });
  const [strokeColor, setStrokeColor] = useState("#1a1a2e");
  const [fillColor, setFillColor] = useState("none");
  const [fillStyle, setFillStyle] = useState<FillStyle>("none");
  const [strokeWidth, setStrokeWidth] = useState(1.5);
  const [fontFamily, setFontFamily] = useState("Kalam, cursive");
  const [fontSize, setFontSize] = useState(16);
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("normal");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    "center",
  );
  const [textVerticalAlign, setTextVerticalAlign] = useState<
    "top" | "middle" | "bottom"
  >("middle");
  const [codeLanguage, setCodeLanguageState] =
    useState<CodeLanguage>("javascript");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  /** Whether the Scribble feature is active (freehand strokes convert to text). */
  const [scribbleEnabled, setScribbleEnabled] = useState(false);
  /**
   * True while a scribble batch is debouncing OR while recognition is in
   * flight.  Drives the pulsing "recognizing" badge in the UI.
   * Cleared in the finally block of flushScribbleBatch so it covers both
   * the wait period and the actual API call duration.
   */
  const [scribblePending, setScribblePending] = useState(false);
  /** True while beautifyLayout() is awaiting the Gemini layout response. */
  const [isBeautifying, setIsBeautifying] = useState(false);
  const [recognitionBackend, setRecognitionBackend] = useState<
    "tesseract" | "gemini"
  >("tesseract");
  const [recognitionApiKey, setRecognitionApiKey] = useState("");
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
    return {
      x: (point.x - panOffset.current.x) / zoom.current,
      y: (point.y - panOffset.current.y) / zoom.current,
    };
  }

  /**
   * Inverse of screenToCanvas.  Used when positioning the floating text
   * editor textarea over an existing text element.
   */
  function canvasToScreen(point: Point): Point {
    return {
      x: point.x * zoom.current + panOffset.current.x,
      y: point.y * zoom.current + panOffset.current.y,
    };
  }

  function getDeviceScale(canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 0 ? canvas.width / rect.width : 1;
  }

  function applyTransform(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ) {
    const scale = getDeviceScale(canvas);
    ctx.setTransform(
      zoom.current * scale,
      0,
      0,
      zoom.current * scale,
      panOffset.current.x * scale,
      panOffset.current.y * scale,
    );
  }

  function clearCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
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
  function renderScene() {
    const canvas = sceneCanvasRef!.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    clearCanvas(canvas);
    ctx.save();
    applyTransform(ctx, canvas);
    const rc = rough.canvas(canvas);
    const all = [...elements.current, ...selectedElements.current];
    elements.current.forEach((el) => drawElement(rc, el, renderScene, all));
    ctx.restore();
  }

  function renderActiveElement() {
    const canvas = interactionCavasRef!.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    clearCanvas(canvas);
    if (!currentElement.current && !hoveredAnchor.current) return;
    ctx.save();
    applyTransform(ctx, canvas);
    if (currentElement.current) {
      const rc = rough.canvas(canvas);
      drawElement(rc, currentElement.current, undefined, [
        ...elements.current,
        ...selectedElements.current,
      ]);
    }
    if (hoveredAnchor.current) {
      drawAnchorHints(
        ctx,
        hoveredAnchor.current.shape,
        hoveredAnchor.current.anchor,
        zoom.current,
      );
    }
    ctx.restore();
  }

  function renderSelection() {
    const canvas = interactionCavasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    clearCanvas(canvas);

    ctx.save();
    applyTransform(ctx, canvas);
    const rc = rough.canvas(canvas);

    if (selectionMarquee.current) {
      const { x1, y1, x2, y2 } = selectionMarquee.current;
      ctx.strokeStyle = "#6366f1";
      ctx.setLineDash([5 / zoom.current, 3 / zoom.current]);
      ctx.lineWidth = 1 / zoom.current;
      ctx.strokeRect(
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.abs(x2 - x1),
        Math.abs(y2 - y1),
      );
      ctx.fillStyle = "rgba(99, 102, 241, 0.05)";
      ctx.fillRect(
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.abs(x2 - x1),
        Math.abs(y2 - y1),
      );
    }

    const all = [...elements.current, ...selectedElements.current];
    selectedElements.current.forEach((el) => {
      drawElement(rc, el, undefined, all);
      drawSelectionBox(ctx, el, zoom.current, all);
    });

    if (hoveredAnchor.current) {
      drawAnchorHints(
        ctx,
        hoveredAnchor.current.shape,
        hoveredAnchor.current.anchor,
        zoom.current,
      );
    }

    ctx.restore();
  }

  function renderInteractionLayer() {
    if (selectedElements.current.length > 0 || selectionMarquee.current) {
      renderSelection();
      return;
    }
    renderActiveElement();
  }

  function scheduleViewportRender() {
    cancelAnimationFrame(viewportRafId.current);
    viewportRafId.current = requestAnimationFrame(() => {
      setPanOffsetDisplay({ ...panOffset.current });
      renderScene();
      renderInteractionLayer();
    });
  }

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
        recognitionConfigRef.current, // always fresh — see the ref comment above
      );

      // If recognition returned nothing useful, leave the strokes as-is.
      if (!text.trim()) return;

      // Compute the union bounding box across all strokes in the batch.
      // This determines where the replacement text element is placed.
      const allPts = strokes.flat();
      const x1 = Math.min(...allPts.map((p) => p.x));
      const y1 = Math.min(...allPts.map((p) => p.y));
      const x2 = Math.max(...allPts.map((p) => p.x));
      const y2 = Math.max(...allPts.map((p) => p.y));
      const strokeHeight = y2 - y1;

      // Atomically replace the raw strokes with the text element.
      elements.current = elements.current.filter((el) => !ids.has(el.id));

      const textEl: SketchElement = {
        id: crypto.randomUUID(),
        tool: "text",
        seed: Math.floor(Math.random() * 100_000),
        strokeColor, // captures current toolbar color at the time of flush
        fillColor: "none",
        fillStyle: "none",
        strokeWidth: 0,
        x1,
        y1,
        // Enforce a minimum width/height so single-character elements aren't
        // invisible (x2 === x1 would produce a zero-width bounding box).
        x2: Math.max(x2, x1 + 40),
        y2: Math.max(y2, y1 + 20),
        text: text.trim(),
        fontFamily,
        // Scale font size to the height of the handwriting: 72% of stroke
        // height, clamped to a sensible range of 14–96 px.
        fontSize: Math.min(Math.max(Math.round(strokeHeight * 0.72), 14), 96),
        fontWeight,
      };

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

  function applyCodeLanguage(language: CodeLanguage) {
    setCodeLanguageState(language);
    updateSelectedElements({ codeLanguage: language });
  }

  async function copySelectedCode() {
    const code = selectedElements.current.find((el) => el.tool === "code");
    if (!code) return false;
    try {
      await navigator.clipboard.writeText(code.text ?? "");
      return true;
    } catch {
      return false;
    }
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

      // Build a lookup map for efficient per-element update application.
      const updateMap = new Map(updates.map((u) => [u.id, u]));

      /**
       * Merges one LayoutUpdate into its matching SketchElement.
       * Coordinates are always updated.  Font properties are only applied to
       * text elements to prevent shapes from accidentally gaining font fields.
       */
      const apply = (el: SketchElement): SketchElement => {
        const u = updateMap.get(el.id);
        if (!u) return el; // element not in the update list — leave untouched
        return {
          ...el,
          x1: u.x1,
          y1: u.y1,
          x2: u.x2,
          y2: u.y2,
          // Only patch text-specific fields on actual text elements.
          ...(u.text !== undefined && el.tool === "text"
            ? { text: u.text }
            : {}),
          ...(u.fontSize !== undefined && el.tool === "text"
            ? { fontSize: u.fontSize }
            : {}),
          ...(u.fontWeight !== undefined && el.tool === "text"
            ? { fontWeight: u.fontWeight }
            : {}),
        };
      };

      // Apply the layout to both element stores in-place.
      elements.current = elements.current.map(apply);
      selectedElements.current = selectedElements.current.map(apply);

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
  function applyThemeColors(isDark: boolean) {
    const fromColor = isDark ? DEFAULT_LIGHT_STROKE : DEFAULT_DARK_STROKE;
    const toColor = isDark ? DEFAULT_DARK_STROKE : DEFAULT_LIGHT_STROKE;

    // Update the toolbar default so new elements use the right colour.
    setStrokeColor(toColor);

    /** Recolours one element if it uses the old theme default; leaves others as-is. */
    const recolor = (el: SketchElement): SketchElement =>
      el.strokeColor.toLowerCase() === fromColor.toLowerCase()
        ? { ...el, strokeColor: toColor }
        : el;

    const nextElements = elements.current.map(recolor);
    const nextSelected = selectedElements.current.map(recolor);

    // Reference equality check: recolor returns the original object unchanged
    // when no colour swap is needed, so a !== comparison correctly detects
    // whether any element was actually modified.
    const anyChanged =
      nextElements.some((el, i) => el !== elements.current[i]) ||
      nextSelected.some((el, i) => el !== selectedElements.current[i]);

    elements.current = nextElements;
    selectedElements.current = nextSelected;

    if (anyChanged) {
      history.current.push(snapshotWithSelection());
      syncHistoryStatus();
    }
    renderScene();
    renderSelection();
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
      setStrokeColor("#1a1a2e");
      setFillColor("none");
      setFillStyle("none");
      setStrokeWidth(1.5);
    }
  }

  function normalizeElement(el: SketchElement): SketchElement {
    if (
      el.tool === "line" ||
      el.tool === "arrow" ||
      el.tool === "freehand" ||
      el.tool === "highlighter"
    ) {
      return el;
    }
    return {
      ...el,
      x1: Math.min(el.x1, el.x2),
      y1: Math.min(el.y1, el.y2),
      x2: Math.max(el.x1, el.x2),
      y2: Math.max(el.y1, el.y2),
    };
  }

  function applyResize(
    el: SketchElement,
    handle: number,
    to: Point,
  ): SketchElement {
    if (el.tool === "arrow") {
      const ends = resolveArrowEndpoints(el, [
        ...elements.current,
        ...selectedElements.current,
      ]);
      if (handle === 0) {
        // Start endpoint — rebind if dropped on a shape, else unbind.
        const target = findBindableShape(to, new Set([el.id]));
        if (target) {
          const p = getAnchorPoint(target.shape, target.anchor);
          return {
            ...el,
            x1: p.x,
            y1: p.y,
            startBinding: {
              elementId: target.shape.id,
              anchor: target.anchor,
            },
          };
        }
        return { ...el, x1: to.x, y1: to.y, startBinding: undefined };
      }
      if (handle === 2) {
        const exclude = new Set<string>([el.id]);
        if (el.startBinding) exclude.add(el.startBinding.elementId);
        const target = findBindableShape(to, exclude);
        if (target) {
          const p = getAnchorPoint(target.shape, target.anchor);
          return {
            ...el,
            x2: p.x,
            y2: p.y,
            endBinding: {
              elementId: target.shape.id,
              anchor: target.anchor,
            },
          };
        }
        return { ...el, x2: to.x, y2: to.y, endBinding: undefined };
      }
      // handle === 1: bend midpoint. Compute signed perpendicular distance
      // from the chord (x1,y1)→(x2,y2) to `to`.
      const dx = ends.x2 - ends.x1;
      const dy = ends.y2 - ends.y1;
      const len = Math.hypot(dx, dy) || 1;
      const mx = (ends.x1 + ends.x2) / 2;
      const my = (ends.y1 + ends.y2) / 2;
      // Perpendicular unit vector matches getArrowControlPoint: (-dy, dx) / len
      const bend = ((to.x - mx) * -dy + (to.y - my) * dx) / len;
      return { ...el, bend };
    }

    const { x, y, w, h } = getBoundingBox(el);
    let nx1 = el.x1,
      ny1 = el.y1,
      nx2 = el.x2,
      ny2 = el.y2;
    const isCornerHandle = [0, 2, 5, 7].includes(handle);

    if (isCornerHandle && w > 0 && h > 0) {
      const movesLeft = [0, 3, 5].includes(handle);
      const movesTop = [0, 1, 2].includes(handle);
      const anchorX = movesLeft ? x + w : x;
      const anchorY = movesTop ? y + h : y;
      const scale = Math.max(
        Math.abs(to.x - anchorX) / w,
        Math.abs(to.y - anchorY) / h,
      );
      const nextW =
        el.tool === "code" ? Math.max(w * scale, CODE_MIN_WIDTH) : w * scale;
      const nextH = h * scale;
      const nextX = movesLeft ? anchorX - nextW : anchorX;
      const nextY = movesTop ? anchorY - nextH : anchorY;

      if (el.tool === "line") {
        return {
          ...el,
          x1: nextX + (el.x1 - x) * scale,
          y1: nextY + (el.y1 - y) * scale,
          x2: nextX + (el.x2 - x) * scale,
          y2: nextY + (el.y2 - y) * scale,
        };
      }

      if (el.tool === "freehand" || el.tool === "highlighter") {
        return {
          ...el,
          x1: nextX,
          y1: nextY,
          x2: nextX + nextW,
          y2: nextY + nextH,
          points: el.points?.map((p) => ({
            x: nextX + (p.x - x) * scale,
            y: nextY + (p.y - y) * scale,
          })),
        };
      }

      return {
        ...el,
        x1: nextX,
        y1: nextY,
        x2: nextX + nextW,
        y2: nextY + nextH,
      };
    }

    const scaleX = w > 0 ? (to.x - x) / w : 1;
    const scaleY = h > 0 ? (to.y - y) / h : 1;

    switch (handle) {
      case 0:
        nx1 = to.x;
        ny1 = to.y;
        break;
      case 1:
        ny1 = to.y;
        break;
      case 2:
        nx2 = to.x;
        ny1 = to.y;
        break;
      case 3:
        nx1 = to.x;
        break;
      case 4:
        nx2 = to.x;
        break;
      case 5:
        nx1 = to.x;
        ny2 = to.y;
        break;
      case 6:
        ny2 = to.y;
        break;
      case 7:
        nx2 = to.x;
        ny2 = to.y;
        break;
    }

    if (el.tool === "code") {
      const movesLeft = [0, 3, 5].includes(handle);
      const currentWidth = Math.abs(nx2 - nx1);
      if (currentWidth < CODE_MIN_WIDTH) {
        if (movesLeft) nx1 = nx2 - CODE_MIN_WIDTH;
        else nx2 = nx1 + CODE_MIN_WIDTH;
      }
    }

    if (el.tool === "freehand" || el.tool === "highlighter") {
      return {
        ...el,
        x1: nx1,
        y1: ny1,
        x2: nx2,
        y2: ny2,
        points: el.points?.map((p) => ({
          x: x + (p.x - x) * scaleX,
          y: y + (p.y - y) * scaleY,
        })),
      };
    }

    return { ...el, x1: nx1, y1: ny1, x2: nx2, y2: ny2 };
  }

  /**
   * Returns the topmost shape eligible for arrow binding (rectangle, ellipse,
   * diamond) under a given canvas-space point — or null if none.
   * Excludes elements in the exclude set so we don't bind an arrow to itself
   * or to the shape on its other end during draw.
   */
  function findBindableShape(
    point: Point,
    exclude: Set<string> = new Set(),
  ): { shape: SketchElement; anchor: AnchorSide } | null {
    const all = [...elements.current, ...selectedElements.current];
    for (let i = all.length - 1; i >= 0; i--) {
      const el = all[i]!;
      if (exclude.has(el.id)) continue;
      if (
        el.tool !== "rectangle" &&
        el.tool !== "ellipse" &&
        el.tool !== "diamond"
      )
        continue;
      if (hitTestElement(el, point, 8 / zoom.current)) {
        // Pick the anchor on this shape whose point is closest to the cursor.
        const anchors = getAllAnchorPoints(el);
        let best = anchors[0]!;
        let bestDist = Infinity;
        for (const a of anchors) {
          const d = Math.hypot(point.x - a.x, point.y - a.y);
          if (d < bestDist) {
            bestDist = d;
            best = a;
          }
        }
        return { shape: el, anchor: best.side };
      }
    }
    return null;
  }

  /**
   * After a shape has moved or resized, walk all elements and update the stored
   * endpoint of any arrow bound to the shape so its data stays consistent with
   * the visual (arrows are also re-resolved at render time, but hit-testing
   * uses the stored coords).
   */
  function syncBoundArrows(shapeIds: Set<string>, list: SketchElement[]) {
    const allShapes = [...elements.current, ...selectedElements.current];
    return list.map((el) => {
      if (el.tool !== "arrow") return el;
      let next = el;
      if (el.startBinding && shapeIds.has(el.startBinding.elementId)) {
        const target = allShapes.find(
          (e) => e.id === el.startBinding!.elementId,
        );
        if (target) {
          const p = getAnchorPoint(target, el.startBinding.anchor);
          next = { ...next, x1: p.x, y1: p.y };
        }
      }
      if (el.endBinding && shapeIds.has(el.endBinding.elementId)) {
        const target = allShapes.find((e) => e.id === el.endBinding!.elementId);
        if (target) {
          const p = getAnchorPoint(target, el.endBinding.anchor);
          next = { ...next, x2: p.x, y2: p.y };
        }
      }
      return next;
    });
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

    if (tool === "code") {
      const codeStrokeColor =
        canvasMode === "dark" ? DEFAULT_DARK_STROKE : DEFAULT_LIGHT_STROKE;
      const codeFillColor =
        canvasMode === "dark"
          ? "rgba(12, 12, 18, 0.82)"
          : "rgba(255, 255, 255, 0.92)";
      const opts = {
        x: screenPoint.x,
        y: screenPoint.y,
        width: Math.max(420, CODE_MIN_WIDTH),
        fontSize: 14,
        color: codeStrokeColor,
        zoom: zoom.current,
        language: "javascript" as const,
        theme: canvasMode,
      };
      openCodeEditor(opts).then((result) => {
        if (!result) return;

        const el: SketchElement = {
          id: crypto.randomUUID(),
          tool: "code",
          seed: Math.floor(Math.random() * 100000),
          strokeColor: codeStrokeColor,
          fillColor: codeFillColor,
          fillStyle: "none",
          strokeWidth: 0,
          x1: point.x,
          y1: point.y,
          x2: point.x + Math.max(result.width, CODE_MIN_WIDTH),
          y2: point.y + result.height,
          text: result.text,
          codeLanguage: result.language,
          fontFamily: "Geist Mono, monospace",
          fontSize: 14,
          fontWeight: "normal",
        };

        selectedElements.current = [el];
        setSelectedTool("code");
        setCodeLanguageState(result.language);
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
        if (hit.codeLanguage) setCodeLanguageState(hit.codeLanguage);
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
    if (el.tool === "code") {
      const screenPos = canvasToScreen({ x: el.x1, y: el.y1 });
      const w = Math.abs(el.x2 - el.x1);
      selectedElements.current = [];
      renderScene();
      renderSelection();
      openCodeEditor({
        currentText: el.text ?? "",
        x: screenPos.x,
        y: screenPos.y,
        width: Math.max(w, CODE_MIN_WIDTH),
        fontSize: el.fontSize ?? 14,
        color: el.strokeColor,
        zoom: zoom.current,
        language: el.codeLanguage ?? "javascript",
        theme: canvasMode,
      }).then((result) => {
        if (result === null) {
          selectedElements.current = [el];
          setSelectedTool(el.tool);
          renderSelection();
          return;
        }
        const updated = {
          ...el,
          text: result.text,
          codeLanguage: result.language,
          x2: el.x1 + Math.max(result.width, CODE_MIN_WIDTH),
          y2: el.y1 + result.height,
        };
        selectedElements.current = [updated];
        setCodeLanguageState(result.language);
        elements.current = elements.current.map((e) =>
          e.id === el.id ? updated : e,
        );
        history.current.push(snapshotWithSelection([updated]));
        syncHistoryStatus();
        renderScene();
        renderSelection();
      });
    } else if (el.tool === "text") {
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
      }).then((result) => {
        if (result === null) {
          selectedElements.current = [el];
          setSelectedTool(el.tool);
          renderSelection();
          return;
        }
        const updated = {
          ...el,
          text: result.text,
          x2: el.x1 + result.width,
          y2: el.y1 + result.height,
        };
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
    codeLanguage,
    setCodeLanguage: applyCodeLanguage,
    copySelectedCode,
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
