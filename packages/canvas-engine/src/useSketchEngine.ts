"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import {
  SketchElement,
  Point,
  Tool,
  ActiveTool,
  FillStyle,
} from "@repo/element/types";
import type { AnchorSide } from "@repo/element/types";
import type { RecognitionConfig } from "@repo/canvas-core/lib/recognition";
import {
  screenToCanvas as screenToCanvasMath,
  canvasToScreen as canvasToScreenMath,
} from "@repo/math";
import * as geometry from "@repo/element/transform";
import {
  applyThemeColors as applyControllerThemeColors,
  beautifyLayout as beautifyControllerLayout,
  type CanvasEffectsContext,
} from "./lib/canvasEffectsController";
import {
  getTextEditorStyle,
  syncToolbarStyleFromElement as syncControllerToolbarStyleFromElement,
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
  getSelectedCanvasElements,
  pasteCanvasElements,
  pasteImageFromClipboard as pasteImageFromClipboardCmd,
} from "./lib/canvasCommands";
import { getSelectedElements } from "@repo/element/selection";
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
import {
  finalizeDrawingInteraction as finalizeDrawingControllerInteraction,
  handleDrawingPointerMove as handleDrawingControllerPointerMove,
  startDrawing as startDrawingController,
  updateArrowHover as updateControllerArrowHover,
  type CanvasInteraction,
  type DrawingControllerContext,
} from "./tools/drawingController";
import { createSketchEditor, type SketchEditor } from "./editor/sketchEditor";
import type { CanvasViewportBounds } from "./lib/pastePlacement";
import type { CanvasTheme, CurrentItemStyle } from "./appState";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 20;
const DUPLICATE_OFFSET = 24;

/**
 * React binding for {@link createSketchEditor}.
 *
 * The editor owns the scene, the history and the view state; this hook creates
 * one, subscribes React to its store, and holds the interaction refs the tool
 * controllers still read directly.
 */
export function useSketchEngine(
  sceneCanvasRef: RefObject<HTMLCanvasElement | null>,
  interactionCavasRef: RefObject<HTMLCanvasElement | null>,
  canvasMode: CanvasTheme = "light",
  onChange?: () => void,
) {
  // Read through a ref so a new `onChange` identity never rebuilds the editor.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [editor] = useState<SketchEditor>(() =>
    createSketchEditor({
      surface: {
        scene: () => sceneCanvasRef.current,
        interaction: () => interactionCavasRef.current,
      },
      theme: canvasMode,
      onChange: () => onChangeRef.current?.(),
    }),
  );

  const appState = useStore(editor.store);
  const {
    activeTool: tool,
    selectedTool,
    currentItemStyle,
    zoomDisplay: zoomLevel,
    panOffsetDisplay,
    canUndo,
    canRedo,
    isBeautifying,
    isScribblePending: scribblePending,
    scribbleEnabled,
    recognitionBackend,
    recognitionApiKey,
  } = appState;
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
  } = currentItemStyle;

  useEffect(() => {
    editor.setTheme(canvasMode);
  }, [editor, canvasMode]);

  // Frame state the tool controllers still reach into directly. These move onto
  // the editor with the controllers themselves.
  const selectionMarquee = useRef<SelectionMarquee | null>(null);
  const selectInteraction = useRef<SelectInteraction>({ type: "idle" });
  const canvasInteraction = useRef<CanvasInteraction>({ type: "idle" });
  const currentElement = useRef<SketchElement | null>(null);
  const isPanning = useRef(false);
  const zoom = useRef(1);
  const panOffset = useRef<Point>({ x: 0, y: 0 });
  const pointerScreenPosition = useRef<Point | null>(null);
  const rafId = useRef<number>(0);
  const viewportRafId = useRef<number>(0);
  const hoveredAnchor = useRef<{
    shape: SketchElement;
    anchor: AnchorSide;
  } | null>(null);
  const pendingScribbleIds = useRef<string[]>([]);
  const scribbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Ref-shaped views onto editor state, so the controllers keep working while
   * they still take a hand-built context. Reads and whole-value writes only;
   * nothing mutates these in place.
   */
  const elements = useRef({
    get current() {
      return editor.getElements();
    },
    set current(next: SketchElement[]) {
      editor.setSceneElements(next);
    },
  }).current as unknown as RefObject<SketchElement[]>;

  const selectedIds = useRef({
    get current() {
      return editor.getState().selectedElementIds as Set<string>;
    },
    set current(next: Set<string>) {
      editor.setAppState({ selectedElementIds: next });
    },
  }).current as unknown as RefObject<Set<string>>;

  const recognitionConfigRef = useRef({
    get current(): RecognitionConfig {
      const state = editor.getState();
      return {
        backend: state.recognitionBackend,
        apiKey: state.recognitionApiKey,
      };
    },
  }).current as unknown as RefObject<RecognitionConfig>;

  function screenToCanvas(point: Point): Point {
    return screenToCanvasMath(point, zoom.current, panOffset.current);
  }

  function canvasToScreen(point: Point): Point {
    return canvasToScreenMath(point, zoom.current, panOffset.current);
  }

  function getViewportBounds(): CanvasViewportBounds | null {
    const canvas = editor.surface.interaction();
    if (!canvas) return null;

    const { width, height } = canvas.getBoundingClientRect();
    const topLeft = screenToCanvas({ x: 0, y: 0 });
    const bottomRight = screenToCanvas({ x: width, y: height });

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  function getPointerPosition(): Point | null {
    return pointerScreenPosition.current
      ? screenToCanvas(pointerScreenPosition.current)
      : null;
  }

  function clearPointerPosition() {
    pointerScreenPosition.current = null;
  }

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
    setPanOffsetDisplay: editor.setPanOffsetDisplay,
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

  function selectedElementsList() {
    return getSelectedElements(editor.getElements(), selectedIds.current);
  }

  function updateSelectedElements(updates: Partial<SketchElement>) {
    if (!editor.updateSelectedElements(updates)) return;
    renderSceneAndSelection();
  }

  function applyStyle(style: Partial<CurrentItemStyle>) {
    if (!editor.setStyle(style)) return;
    renderSceneAndSelection();
  }

  function syncToolbarStyleFromElement(element: SketchElement) {
    syncControllerToolbarStyleFromElement(editor, element);
  }

  function saveSelectedElementEdit(element: SketchElement) {
    editor.saveSelectedElementEdit(element);
    renderSceneAndSelection();
  }

  function commitCreatedElement(
    element: SketchElement,
    options: { select?: boolean; nextTool?: ActiveTool } = {},
  ) {
    editor.commitCreatedElement(element, options);
    renderSceneAndSelection();
  }

  function commitSceneElements(nextElements: SketchElement[]) {
    editor.commitSceneElements(nextElements);
  }

  function textEditorStyle() {
    return getTextEditorStyle(editor, zoom.current);
  }

  function commitSelectedElements() {
    editor.commitSelectedElements();
    renderSceneAndSelection();
  }

  const clearSelection = editor.clearSelection;
  const setSelectedElements = editor.setSelectedElements;
  const pushHistorySnapshot = editor.pushHistorySnapshot;
  const setSelectedTool = (next: Tool | null) =>
    editor.setAppState({ selectedTool: next });

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
      allElements: [...editor.getElements()],
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
      [...editor.getElements()],
      zoom.current,
      exclude,
    );
  }

  function syncBoundArrows(shapeIds: Set<string>, list: SketchElement[]) {
    return geometry.syncBoundArrows(shapeIds, list, [...editor.getElements()]);
  }

  function commitSelectedElementSnapshot({ render = false } = {}) {
    const normalized = selectedElementsList().map(normalizeElement);
    editor.commitUpdatedElements(normalized, {
      selectedElementIds: normalized.map((element) => element.id),
    });
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
      setScribblePending: editor.setScribblePending,
      pushHistorySnapshot,
      renderScene,
    };
  }

  function queueScribble(id: string) {
    queueScribbleStroke(scribbleControllerContext(), id);
  }

  function drawingControllerContext(): DrawingControllerContext {
    return {
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
      commitSceneElements,
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
      setZoomLevel: editor.setZoomDisplay,
      scheduleViewportRender,
    };
  }

  function canvasCommandsContext(): CanvasCommandsContext {
    return {
      editor,
      screenToCanvas,
      renderScene,
      renderSceneAndSelection,
    };
  }

  function canvasEffectsContext(): CanvasEffectsContext {
    return {
      elements,
      recognitionConfig: recognitionConfigRef,
      selectedElementsList,
      setStrokeColor: (color: string) =>
        editor.setToolbarStyle({ strokeColor: color }),
      setIsBeautifying: editor.setIsBeautifying,
      syncBoundArrows,
      pushHistorySnapshot,
      renderSceneAndSelection,
    };
  }

  function onPointerDown(screenPoint: Point, e: React.PointerEvent) {
    pointerScreenPosition.current = screenPoint;
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
    pointerScreenPosition.current = screenPoint;
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

  function getClipboardElements(): SketchElement[] {
    return getSelectedCanvasElements(canvasCommandsContext());
  }

  function pasteClipboardElements(
    sourceElements: SketchElement[],
    offset: Point,
  ): boolean {
    return pasteCanvasElements(canvasCommandsContext(), sourceElements, offset);
  }

  /**
   * Pastes an image from the clipboard onto the canvas. Drops it under the
   * pointer when one is known, otherwise at the centre of the current viewport.
   * Returns true when an image was found (so the caller can consume the event).
   */
  function pasteClipboardImage(clipboardData: DataTransfer | null): boolean {
    const bounds = getViewportBounds();
    const canvasPoint =
      getPointerPosition() ??
      (bounds
        ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
        : { x: 0, y: 0 });
    return pasteImageFromClipboardCmd(
      canvasCommandsContext(),
      clipboardData,
      canvasPoint,
    );
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
    editor,
    elements,
    setElements,
    tool,

    setTool: editor.setActiveTool,
    strokeColor,
    setStrokeColor: (color: string) => applyStyle({ strokeColor: color }),
    fillColor,
    setFillColor: (color: string) => applyStyle({ fillColor: color }),
    fillStyle,
    setFillStyle: (style: FillStyle) => applyStyle({ fillStyle: style }),
    strokeWidth,
    setStrokeWidth: (width: number) => applyStyle({ strokeWidth: width }),
    selectedTool,
    fontFamily,
    setFontFamily: (font: string) => applyStyle({ fontFamily: font }),
    fontSize,
    setFontSize: (size: number) => applyStyle({ fontSize: size }),
    fontWeight,
    setFontWeight: (weight: "normal" | "bold") =>
      applyStyle({ fontWeight: weight }),
    textAlign,
    setTextAlign: (align: "left" | "center" | "right") =>
      applyStyle({ textAlign: align }),
    textVerticalAlign,
    setTextVerticalAlign: (align: "top" | "middle" | "bottom") =>
      applyStyle({ textVerticalAlign: align }),
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
    canUndo,
    canRedo,
    getClipboardElements,
    getPointerPosition,
    clearPointerPosition,
    getViewportBounds,
    pasteClipboardElements,
    pasteClipboardImage,
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
    setScribbleEnabled: editor.setScribbleEnabled,
    scribblePending,
    recognitionBackend,
    setRecognitionBackend: editor.setRecognitionBackend,
    recognitionApiKey,
    setRecognitionApiKey: editor.setRecognitionApiKey,
  };
}
