"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { SketchElement, Point, FillStyle } from "@repo/element/types";
import { createSketchEditor, type SketchEditor } from "./editor/sketchEditor";
import type { CanvasTheme } from "./appState";

/**
 * React binding for {@link createSketchEditor}.
 *
 * Creates one editor and subscribes React to its view state. Every field it
 * returns maps straight onto a public editor method; the flat shape stays only
 * until the canvas page talks to the editor directly.
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

  /** Ref-shaped views for callers that still expect refs. */
  const elementsRef = useRef({
    get current() {
      return editor.getElements();
    },
  }).current as { readonly current: SketchElement[] };

  const isPanningRef = useRef({
    get current() {
      return editor.getState().panMode;
    },
    set current(next: boolean) {
      editor.setPanMode(next);
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
    hasElements,
    isBeautifying,
    isScribblePending: scribblePending,
    scribbleEnabled,
    recognitionBackend,
    recognitionApiKey,
  } = appState;

  useEffect(() => {
    editor.setTheme(canvasMode);
  }, [editor, canvasMode]);

  return {
    editor,
    tool,
    setTool: editor.setTool,
    selectedTool,

    strokeColor: currentItemStyle.strokeColor,
    setStrokeColor: (color: string) => editor.setStyle({ strokeColor: color }),
    fillColor: currentItemStyle.fillColor,
    setFillColor: (color: string) => editor.setStyle({ fillColor: color }),
    fillStyle: currentItemStyle.fillStyle,
    setFillStyle: (style: FillStyle) => editor.setStyle({ fillStyle: style }),
    strokeWidth: currentItemStyle.strokeWidth,
    setStrokeWidth: (width: number) => editor.setStyle({ strokeWidth: width }),
    fontFamily: currentItemStyle.fontFamily,
    setFontFamily: (font: string) => editor.setStyle({ fontFamily: font }),
    fontSize: currentItemStyle.fontSize,
    setFontSize: (size: number) => editor.setStyle({ fontSize: size }),
    fontWeight: currentItemStyle.fontWeight,
    setFontWeight: (weight: "normal" | "bold") =>
      editor.setStyle({ fontWeight: weight }),
    textAlign: currentItemStyle.textAlign,
    setTextAlign: (align: "left" | "center" | "right") =>
      editor.setStyle({ textAlign: align }),
    textVerticalAlign: currentItemStyle.textVerticalAlign,
    setTextVerticalAlign: (align: "top" | "middle" | "bottom") =>
      editor.setStyle({ textVerticalAlign: align }),

    applyThemeColors: editor.applyThemeColors,
    beautifyLayout: editor.beautify,
    isBeautifying,
    hasElements,

    zoomLevel,
    panOffsetDisplay,
    onPointerDown: (screenPoint: Point, e: React.PointerEvent) =>
      editor.pointerDown(screenPoint, { button: e.button, shiftKey: e.shiftKey }),
    onPointerMove: editor.pointerMove,
    finalizeElement: editor.pointerUp,
    handleZoom: editor.zoomAt,
    onPan: editor.panBy,
    getCursorForPoint: editor.getCursorForPoint,
    isPanningRef,
    stopPanning: () => editor.setPanMode(false),

    undo: editor.undo,
    redo: editor.redo,
    canUndo,
    canRedo,

    getClipboardElements: editor.getSelectedElements,
    clearPointerPosition: editor.pointerLeave,
    pasteClipboardElements: editor.paste,
    pasteClipboardImage: editor.pasteImage,
    deleteSelected: editor.deleteSelected,
    duplicateSelected: editor.duplicateSelected,
    deselect: editor.deselect,

    handleDrop: (e: DragEvent, point: Point) =>
      editor.dropFiles(e.dataTransfer, point),
    onDoubleClick: editor.doubleClick,
    editSelected: editor.editSelected,
    renderScene: editor.redraw,
    renderSelection: editor.redraw,

    elements: elementsRef,
    setElements: editor.loadScene,
    scribbleEnabled,
    setScribbleEnabled: (scribbleEnabled: boolean) =>
      editor.setRecognitionSettings({ scribbleEnabled }),
    scribblePending,
    recognitionBackend,
    setRecognitionBackend: (recognitionBackend: "tesseract" | "gemini") =>
      editor.setRecognitionSettings({ recognitionBackend }),
    recognitionApiKey,
    setRecognitionApiKey: (recognitionApiKey: string) =>
      editor.setRecognitionSettings({ recognitionApiKey }),
  };
}
