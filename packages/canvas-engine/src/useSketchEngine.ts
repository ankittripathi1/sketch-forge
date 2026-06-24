"use client";

import { RefObject, useRef, useState } from "react";
import {
  SketchElement,
  Point,
  Tool,
  ActiveTool,
  FillStyle,
} from "@repo/element/types";
import type { AnchorSide } from "@repo/element/types";
import { createHistory } from "@repo/element/history";
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
  applyFillColor as applyControllerFillColor,
  applyFillStyle as applyControllerFillStyle,
  applyFontFamily as applyControllerFontFamily,
  applyFontSize as applyControllerFontSize,
  applyFontWeight as applyControllerFontWeight,
  applyStrokeColor as applyControllerStrokeColor,
  applyStrokeWidth as applyControllerStrokeWidth,
  applyTextAlign as applyControllerTextAlign,
  applyTextVerticalAlign as applyControllerTextVerticalAlign,
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
  getSelectedCanvasElements,
  pasteCanvasElements,
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
import { createScene } from "./scene";
import { createEditorController } from "./editor/editorController";
import type { CanvasViewportBounds } from "./lib/pastePlacement";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 20;
const DUPLICATE_OFFSET = 24;

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

  const [tool, setTool] = useState<ActiveTool>("rectangle");
  const [historyStatus, setHistoryStatus] = useState({
    canUndo: false,
    canRedo: false,
  });
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [scribblePending, setScribblePending] = useState(false);
  const [isBeautifying, setIsBeautifying] = useState(false);
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
  const scene = useRef(createScene());
  const currentElement = useRef<SketchElement | null>(null);
  const isPanning = useRef(false);
  const zoom = useRef(1);
  const panOffset = useRef<Point>({ x: 0, y: 0 });
  const pointerScreenPosition = useRef<Point | null>(null);
  const rafId = useRef<number>(0);
  const viewportRafId = useRef<number>(0);
  const history = useRef(createHistory());
  const hoveredAnchor = useRef<{
    shape: SketchElement;
    anchor: AnchorSide;
  } | null>(null);
  const pendingScribbleIds = useRef<string[]>([]);
  const scribbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  recognitionConfigRef.current = {
    backend: recognitionBackend,
    apiKey: recognitionApiKey,
  };

  function screenToCanvas(point: Point): Point {
    return screenToCanvasMath(point, zoom.current, panOffset.current);
  }

  function canvasToScreen(point: Point): Point {
    return canvasToScreenMath(point, zoom.current, panOffset.current);
  }

  function getViewportBounds(): CanvasViewportBounds | null {
    const canvas = interactionCavasRef.current;
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

  const setCurrentItemStyle = (style: {
    strokeColor: string;
    fillColor: string;
    fillStyle: FillStyle;
    strokeWidth: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: "normal" | "bold";
    textAlign: "left" | "center" | "right";
    textVerticalAlign: "top" | "middle" | "bottom";
  }) => {
    setStrokeColor(style.strokeColor);
    setFillColor(style.fillColor);
    setFillStyle(style.fillStyle);
    setStrokeWidth(style.strokeWidth);
    setFontFamily(style.fontFamily);
    setFontSize(style.fontSize);
    setFontWeight(style.fontWeight);
    setTextAlign(style.textAlign);
    setTextVerticalAlign(style.textVerticalAlign);
  };

  const editor = createEditorController({
    elements,
    scene,
    history,
    selectedIds,
    activeTool: tool,
    selectedTool,
    zoom,
    zoomLevel,
    panOffset,
    canvasMode,
    isPanning,
    isBeautifying,
    scribblePending,
    currentItemStyle: {
      strokeColor,
      fillColor,
      fillStyle,
      strokeWidth,
      fontFamily,
      fontSize,
      fontWeight,
      textAlign,
      textVerticalAlign,
    },
    setActiveTool: setTool,
    setSelectedTool,
    setHistoryStatus,
    setCurrentItemStyle,
    setZoomLevel,
    setPanOffsetDisplay,
    setIsBeautifying,
    setScribblePending,
    onChange,
  });

  function selectedElementsList() {
    return getSelectedElements(elements.current, selectedIds.current);
  }

  function updateSelectedElements(updates: Partial<SketchElement>) {
    if (!editor.updateSelectedElements(updates)) return;
    renderSceneAndSelection();
  }

  function syncToolbarStyleFromElement(element: SketchElement) {
    syncControllerToolbarStyleFromElement(
      toolStyleControllerContext(),
      element,
    );
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
    return getTextEditorStyle(toolStyleControllerContext());
  }

  function commitSelectedElements() {
    editor.commitSelectedElements();
    renderSceneAndSelection();
  }

  const clearSelection = editor.clearSelection;
  const setSelectedElements = editor.setSelectedElements;
  const pushHistorySnapshot = editor.pushHistorySnapshot;

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
      setZoomLevel,
      scheduleViewportRender,
    };
  }

  function canvasCommandsContext(): CanvasCommandsContext {
    return {
      elements,
      selectedIds,
      history,
      setSceneElements: editor.setSceneElements,
      getAppState: editor.getAppState,
      applyAppState: editor.applyAppState,
      onChange,
      screenToCanvas,
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

    setTool: editor.applyActiveTool,
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
    getClipboardElements,
    getPointerPosition,
    clearPointerPosition,
    getViewportBounds,
    pasteClipboardElements,
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
