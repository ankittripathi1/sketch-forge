"use client";

import { RefObject, useRef, useState } from "react";
import rough from "roughjs";
import { SketchElement, Point, Tool, FillStyle } from "@repo/canvas-core/types";
import { drawElement } from "@repo/canvas-core/renderElement";
import { createHistory } from "@repo/canvas-core/history";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 20;
const ZOOM_SENSITIVITY = 0.001;

export function useSketchEngine(
  sceneCanvasRef: RefObject<HTMLCanvasElement | null>,
  interactionCavasRef: RefObject<HTMLCanvasElement | null>,
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
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panOffsetDisplay, setPanOffsetDisplay] = useState<Point>({
    x: 0,
    y: 0,
  });

  const elements = useRef<SketchElement[]>([]);
  const currentElement = useRef<SketchElement | null>(null);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const isPanningDragging = useRef(false);
  const panStartPoint = useRef<Point>({ x: 0, y: 0 });
  const zoom = useRef(1);
  const panOffset = useRef<Point>({ x: 0, y: 0 });
  const rafId = useRef<number>(0);
  const history = useRef(createHistory());

  function screenToCanvas(point: Point): Point {
    return {
      x: (point.x - panOffset.current.x) / zoom.current,
      y: (point.y - panOffset.current.y) / zoom.current,
    };
  }

  function applyTransform(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(
      zoom.current,
      0,
      0,
      zoom.current,
      panOffset.current.x,
      panOffset.current.y,
    );
  }

  function clearCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function renderScene() {
    const canvas = sceneCanvasRef!.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rc = rough.canvas(canvas);
    clearCanvas(canvas);
    ctx.save();
    applyTransform(ctx);
    elements.current.forEach((el) => drawElement(rc, el));
    ctx.restore();
  }

  function renderActiveElement() {
    const canvas = interactionCavasRef!.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rc = rough.canvas(canvas);
    clearCanvas(canvas);
    if (!currentElement.current) return;
    ctx.save();
    applyTransform(ctx);
    drawElement(rc, currentElement.current);
    ctx.restore();
  }

  function clearInteractionCanvas() {
    const canvas = interactionCavasRef.current;
    if (canvas)
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function syncHistoryStatus() {
    setHistoryStatus({
      canUndo: history.current.canUndo(),
      canRedo: history.current.canRedo(),
    });
  }

  function onPointerDown(screenPoint: Point) {
    if (isPanning.current) {
      panStartPoint.current = screenPoint;
      isPanningDragging.current = true;
      return;
    }
    const point = screenToCanvas(screenPoint);
    isDrawing.current = true;
    currentElement.current = {
      id: crypto.randomUUID(),
      tool,
      seed: Math.floor(Math.random() * 100000),
      strokeColor,
      fillColor,
      fillStyle,
      strokeWidth,
      x1: point.x,
      y1: point.y,
      x2: point.x,
      y2: point.y,
      points: tool === "freehand" ? [point] : undefined,
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
      setPanOffsetDisplay({ ...panOffset.current });
      renderScene();
      renderActiveElement();
      return;
    }
    if (!isDrawing.current || !currentElement.current) return;
    const point = screenToCanvas(screenPoint);
    currentElement.current = {
      ...currentElement.current,
      x2: point.x,
      y2: point.y,
      points: currentElement.current.points
        ? [...currentElement.current.points, point]
        : undefined,
    };
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(renderActiveElement);
  }

  function finalizeElement() {
    if (isPanning.current) {
      isPanningDragging.current = false;
      return;
    }

    if (!isDrawing.current || !currentElement.current) return;
    isDrawing.current = false;

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
    } else {
      elements.current = [...elements.current, currentElement.current!];
    }

    currentElement.current = null;
    history.current.push(elements.current);
    syncHistoryStatus();
    renderScene();
    clearInteractionCanvas();
  }

  function handleZoom(delta: number, cursorScreen: Point) {
    const newZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, zoom.current * (1 + delta)),
    );
    panOffset.current = {
      x:
        cursorScreen.x -
        (cursorScreen.x - panOffset.current.x) * (newZoom / zoom.current),
      y:
        cursorScreen.y -
        (cursorScreen.y - panOffset.current.y) * (newZoom / zoom.current),
    };
    zoom.current = newZoom;
    setZoomLevel(Math.round(newZoom * 100));
    setPanOffsetDisplay({ ...panOffset.current });
    renderScene();
    renderActiveElement();
  }

  function startPanning() {
    isPanning.current = true;
  }
  function stopPanning() {
    isPanning.current = false;
  }

  function undo() {
    const previous = history.current.undo();
    if (previous === null) return;
    elements.current = previous;
    syncHistoryStatus();
    renderScene();
  }

  function redo() {
    const next = history.current.redo();
    if (next === null) return;
    elements.current = next;
    syncHistoryStatus();
    renderScene();
  }

  return {
    tool,
    setTool,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    fillStyle,
    setFillStyle,
    strokeWidth,
    setStrokeWidth,
    onPointerDown,
    onPointerMove,
    finalizeElement,
    zoomLevel,
    panOffsetDisplay,
    handleZoom,
    isPanningRef: isPanning,
    startPanning,
    stopPanning,
    undo,
    redo,
    canUndo: historyStatus.canUndo,
    canRedo: historyStatus.canRedo,
  };
}
