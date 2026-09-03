"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { SketchElement, Point, FillStyle } from "@repo/element/types";
import {
  applyThemeColors,
  beautifyLayout,
} from "./lib/canvasEffectsController";
import {
  deleteSelectedElements,
  deselectCanvas,
  duplicateSelectedElements,
  handleImageDrop,
  redoCanvas,
  replaceCanvasElements,
  undoCanvas,
  getSelectedCanvasElements,
  pasteCanvasElements,
  pasteImageFromClipboard,
} from "./lib/canvasCommands";
import {
  beginPanning,
  getCursorForPoint as getViewportCursorForPoint,
  handlePanningMove,
  panViewport,
  zoomViewport,
} from "./lib/viewportController";
import {
  editSelectedText,
  handleTextDoubleClick,
  startTextCreation,
} from "./tools/textController";
import {
  finalizeSelectInteraction,
  handleSelectPointerDown,
  handleSelectPointerMove,
} from "./tools/selectController";
import {
  finalizeDrawingInteraction,
  handleDrawingPointerMove,
  startDrawing,
  updateArrowHover,
} from "./tools/drawingController";
import { createSketchEditor, type SketchEditor } from "./editor/sketchEditor";
import type { CanvasTheme, CurrentItemStyle } from "./appState";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 20;
const DUPLICATE_OFFSET = 24;

/**
 * React binding for {@link createSketchEditor}.
 *
 * Creates one editor, subscribes React to its view state, and routes pointer
 * events to the tool controllers. All state lives on the editor; this hook
 * holds none of its own.
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

  /**
   * Ref-shaped views onto frame state, for callers that still expect refs.
   * They go away when the pages move to calling the editor directly.
   */
  const elementsRef = useRef({
    get current() {
      return editor.frame.elements;
    },
    set current(next: SketchElement[]) {
      editor.setSceneElements(next);
    },
  }).current as unknown as { current: SketchElement[] };

  const isPanningRef = useRef({
    get current() {
      return editor.frame.isPanning;
    },
    set current(next: boolean) {
      editor.frame.isPanning = next;
    },
  }).current as unknown as { current: boolean };

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

  useEffect(() => {
    editor.setTheme(canvasMode);
  }, [editor, canvasMode]);

  function applyStyle(style: Partial<CurrentItemStyle>) {
    if (!editor.setStyle(style)) return;
    editor.renderSceneAndSelection();
  }

  function onPointerDown(screenPoint: Point, e: React.PointerEvent) {
    editor.frame.pointerScreenPosition = screenPoint;
    if (tool === "select" && e.button === 2) return;
    if (editor.frame.isPanning) {
      return beginPanning(editor, screenPoint);
    }

    const point = editor.screenToCanvas(screenPoint);
    if (tool === "text") {
      return startTextCreation(editor, screenPoint, point);
    }

    if (tool !== "select" && editor.getState().selectedElementIds.size > 0) {
      editor.commitSelectedElements();
      editor.renderSceneAndSelection();
    }

    if (tool === "select") {
      return handleSelectPointerDown(editor, point, e.shiftKey);
    }
    startDrawing(editor, point);
  }

  function onPointerMove(screenPoint: Point) {
    editor.frame.pointerScreenPosition = screenPoint;
    if (handlePanningMove(editor, screenPoint)) return;
    if (tool === "select" && handleSelectPointerMove(editor, screenPoint))
      return;
    const point = editor.screenToCanvas(screenPoint);
    if (updateArrowHover(editor, point)) return;
    handleDrawingPointerMove(editor, point);
  }

  async function finalizeElement() {
    if (editor.frame.canvasInteraction.type === "panning") {
      editor.frame.canvasInteraction = { type: "idle" };
      return;
    }

    if (tool === "select") {
      return finalizeSelectInteraction(editor);
    }
    finalizeDrawingInteraction(editor);
  }

  function stopPanning() {
    editor.frame.isPanning = false;
    if (editor.frame.canvasInteraction.type === "panning") {
      editor.frame.canvasInteraction = { type: "idle" };
    }
  }

  /**
   * Pastes an image from the clipboard. Drops it under the pointer when one is
   * known, otherwise at the centre of the current viewport. Returns true when
   * an image was found, so the caller can consume the event.
   */
  function pasteClipboardImage(clipboardData: DataTransfer | null): boolean {
    const bounds = editor.getViewportBounds();
    const canvasPoint =
      editor.getPointerPosition() ??
      (bounds
        ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
        : { x: 0, y: 0 });
    return pasteImageFromClipboard(editor, clipboardData, canvasPoint);
  }

  return {
    editor,
    tool,
    setTool: editor.setActiveTool,
    selectedTool,

    strokeColor: currentItemStyle.strokeColor,
    setStrokeColor: (color: string) => applyStyle({ strokeColor: color }),
    fillColor: currentItemStyle.fillColor,
    setFillColor: (color: string) => applyStyle({ fillColor: color }),
    fillStyle: currentItemStyle.fillStyle,
    setFillStyle: (style: FillStyle) => applyStyle({ fillStyle: style }),
    strokeWidth: currentItemStyle.strokeWidth,
    setStrokeWidth: (width: number) => applyStyle({ strokeWidth: width }),
    fontFamily: currentItemStyle.fontFamily,
    setFontFamily: (font: string) => applyStyle({ fontFamily: font }),
    fontSize: currentItemStyle.fontSize,
    setFontSize: (size: number) => applyStyle({ fontSize: size }),
    fontWeight: currentItemStyle.fontWeight,
    setFontWeight: (weight: "normal" | "bold") =>
      applyStyle({ fontWeight: weight }),
    textAlign: currentItemStyle.textAlign,
    setTextAlign: (align: "left" | "center" | "right") =>
      applyStyle({ textAlign: align }),
    textVerticalAlign: currentItemStyle.textVerticalAlign,
    setTextVerticalAlign: (align: "top" | "middle" | "bottom") =>
      applyStyle({ textVerticalAlign: align }),

    applyThemeColors: (
      isDark: boolean,
      options?: { recordHistory?: boolean },
    ) => applyThemeColors(editor, isDark, options),
    beautifyLayout: () => beautifyLayout(editor),
    isBeautifying,

    zoomLevel,
    panOffsetDisplay,
    onPointerDown,
    onPointerMove,
    finalizeElement,
    handleZoom: (delta: number, cursorScreen: Point) =>
      zoomViewport({
        editor,
        cursorScreen,
        delta,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
      }),
    onPan: (dx: number, dy: number) => panViewport(editor, dx, dy),
    getCursorForPoint: (screenPoint: Point) =>
      getViewportCursorForPoint(editor, screenPoint),
    isPanningRef,
    stopPanning,

    undo: () => undoCanvas(editor),
    redo: () => redoCanvas(editor),
    canUndo,
    canRedo,

    getClipboardElements: () => getSelectedCanvasElements(editor),
    getPointerPosition: editor.getPointerPosition,
    clearPointerPosition: editor.clearPointerPosition,
    getViewportBounds: editor.getViewportBounds,
    pasteClipboardElements: (source: SketchElement[], offset: Point) =>
      pasteCanvasElements(editor, source, offset),
    pasteClipboardImage,
    deleteSelected: () => deleteSelectedElements(editor),
    duplicateSelected: () =>
      duplicateSelectedElements(editor, DUPLICATE_OFFSET),
    deselect: () => deselectCanvas(editor),

    handleDrop: (e: DragEvent, point: Point) =>
      handleImageDrop(editor, e, point),
    onDoubleClick: (screenPoint: Point) =>
      handleTextDoubleClick(editor, screenPoint),
    editSelected: () => editSelectedText(editor),
    renderScene: editor.renderScene,
    renderSelection: editor.renderSelection,

    elements: elementsRef,
    setElements: (next: SketchElement[]) => replaceCanvasElements(editor, next),
    scribbleEnabled,
    setScribbleEnabled: editor.setScribbleEnabled,
    scribblePending,
    recognitionBackend,
    setRecognitionBackend: editor.setRecognitionBackend,
    recognitionApiKey,
    setRecognitionApiKey: editor.setRecognitionApiKey,
  };
}
