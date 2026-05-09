"use client";

import { RefObject, useRef, useState } from "react";
import rough from "roughjs";
import { SketchElement, Point, Tool, FillStyle } from "@repo/canvas-core/types";
import { drawElement, drawSelectionBox } from "@repo/canvas-core/renderElement";
import { createHistory } from "@repo/canvas-core/history";
import { openTextEditor } from "../_utils/textEditor";
import {
  hitTestElement,
  hitTestHandle,
  getBoundingBox,
} from "@repo/canvas-core/hitDetection";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 20;

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
  const [fontFamily, setFontFamily] = useState('"Caveat", cursive');
  const [fontSize, setFontSize] = useState(16);
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("normal");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panOffsetDisplay, setPanOffsetDisplay] = useState<Point>({
    x: 0,
    y: 0,
  });

  const selectedElement = useRef<SketchElement | null>(null);
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

  function screenToCanvas(point: Point): Point {
    return {
      x: (point.x - panOffset.current.x) / zoom.current,
      y: (point.y - panOffset.current.y) / zoom.current,
    };
  }

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

  function renderScene() {
    const canvas = sceneCanvasRef!.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rc = rough.canvas(canvas);
    clearCanvas(canvas);
    ctx.save();
    applyTransform(ctx, canvas);
    elements.current.forEach((el) => drawElement(rc, el, renderScene));
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
    applyTransform(ctx, canvas);
    drawElement(rc, currentElement.current);
    ctx.restore();
  }

  function renderSelection() {
    const canvas = interactionCavasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    clearCanvas(canvas);
    if (!selectedElement.current) return;
    ctx.save();
    applyTransform(ctx, canvas);
    drawElement(rough.canvas(canvas), selectedElement.current);
    drawSelectionBox(ctx, selectedElement.current, zoom.current);
    ctx.restore();
  }

  function clearInteractionCanvas() {
    const canvas = interactionCavasRef.current;
    if (canvas)
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function renderInteractionLayer() {
    if (selectedElement.current) {
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

  function syncHistoryStatus() {
    setHistoryStatus({
      canUndo: history.current.canUndo(),
      canRedo: history.current.canRedo(),
    });
  }

  function applyTool(nextTool: Tool) {
    setTool(nextTool);
    if (nextTool === "highlighter") {
      setStrokeColor("#e8d95a");
      setFillColor("none");
      setFillStyle("none");
      setStrokeWidth(18);
    }
  }

  function commitSelected() {
    if (!selectedElement.current) return;
    elements.current = [...elements.current, selectedElement.current];
    history.current.push(elements.current);
    syncHistoryStatus();
    selectedElement.current = null;
    setSelectedTool(null);
    renderScene();
    clearInteractionCanvas();
  }

  function deleteSelected() {
    if (!selectedElement.current) return;
    selectedElement.current = null;
    setSelectedTool(null);
    history.current.push(elements.current);
    syncHistoryStatus();
    renderScene();
    clearInteractionCanvas();
  }

  function deselect() {
    if (!selectedElement.current) return;
    commitSelected();
  }

  function getCursorForPoint(screenPoint: Point): string {
    if (tool !== "select") return tool === "text" ? "text" : "crosshair";
    if (isPanning.current) return "grab";
    const point = screenToCanvas(screenPoint);
    if (selectedElement.current) {
      const pad = 6 / zoom.current;
      const hi = hitTestHandle(
        selectedElement.current,
        point,
        pad,
        zoom.current,
      );
      if (hi !== null) return HANDLE_CURSORS[hi]!;
      if (hitTestElement(selectedElement.current, point, 8 / zoom.current))
        return "move";
    }
    const hit = [...elements.current]
      .reverse()
      .find((el) => hitTestElement(el, point, 8 / zoom.current));
    return hit ? "move" : "default";
  }

  function applyResize(
    origin: SketchElement,
    handleIdx: number,
    point: Point,
  ): SketchElement {
    const el = { ...origin };
    const bbox = getBoundingBox(origin);

    // Handle index layout:
    // 0  1  2
    // 3     4
    // 5  6  7
    const movesLeft = [0, 3, 5].includes(handleIdx);
    const movesRight = [2, 4, 7].includes(handleIdx);
    const movesTop = [0, 1, 2].includes(handleIdx);
    const movesBottom = [5, 6, 7].includes(handleIdx);
    const isCornerHandle = [0, 2, 5, 7].includes(handleIdx);

    if (isCornerHandle && bbox.w > 0 && bbox.h > 0) {
      const anchorX = movesLeft ? bbox.x + bbox.w : bbox.x;
      const anchorY = movesTop ? bbox.y + bbox.h : bbox.y;
      const rawW = Math.abs(point.x - anchorX);
      const rawH = Math.abs(point.y - anchorY);
      const scale = Math.max(rawW / bbox.w, rawH / bbox.h);
      const nextW = bbox.w * scale;
      const nextH = bbox.h * scale;
      const nextX = movesLeft ? anchorX - nextW : anchorX;
      const nextY = movesTop ? anchorY - nextH : anchorY;

      el.x1 = nextX;
      el.y1 = nextY;
      el.x2 = nextX + nextW;
      el.y2 = nextY + nextH;

      if (origin.tool === "line") {
        el.x1 = nextX + (origin.x1 - bbox.x) * scale;
        el.y1 = nextY + (origin.y1 - bbox.y) * scale;
        el.x2 = nextX + (origin.x2 - bbox.x) * scale;
        el.y2 = nextY + (origin.y2 - bbox.y) * scale;
      }

      if (el.points && origin.points) {
        el.points = origin.points.map((p) => ({
          x: nextX + (p.x - bbox.x) * scale,
          y: nextY + (p.y - bbox.y) * scale,
        }));
      }

      return el;
    }

    if (movesLeft) el.x1 = point.x;
    if (movesRight) el.x2 = point.x;
    if (movesTop) el.y1 = point.y;
    if (movesBottom) el.y2 = point.y;

    if (el.points && origin.points) {
      const newX1 = movesLeft ? point.x : bbox.x;
      const newY1 = movesTop ? point.y : bbox.y;
      const newX2 = movesRight ? point.x : bbox.x + bbox.w;
      const newY2 = movesBottom ? point.y : bbox.y + bbox.h;
      const scaleX = bbox.w === 0 ? 1 : (newX2 - newX1) / bbox.w;
      const scaleY = bbox.h === 0 ? 1 : (newY2 - newY1) / bbox.h;
      el.points = origin.points.map((p) => ({
        x: newX1 + (p.x - bbox.x) * scaleX,
        y: newY1 + (p.y - bbox.y) * scaleY,
      }));
      el.x1 = newX1;
      el.y1 = newY1;
      el.x2 = newX2;
      el.y2 = newY2;
    }

    return el;
  }

  function onPointerDown(screenPoint: Point) {
    if (isPanning.current) {
      panStartPoint.current = screenPoint;
      isPanningDragging.current = true;
      return;
    }

    // If something is selected but we're drawing with a different tool, commit it back first
    if (selectedElement.current && tool !== "select") {
      elements.current = [...elements.current, selectedElement.current];
      selectedElement.current = null;
      setSelectedTool(null);
      renderScene();
      clearInteractionCanvas();
    }

    const point = screenToCanvas(screenPoint);

    if (tool === "text") {
      openTextEditor({
        screenPos: screenPoint,
        canvasPos: point,
        fontSize,
        color: strokeColor,
        zoom: zoom.current,
        fontFamily,
        fontWeight,
        onCommit: (text, canvasPos) => {
          if (!text.trim()) return;

          const LINE_HEIGHT = 1.2;
          const yOffset = ((LINE_HEIGHT - 1) / 2) * fontSize;

          const dummyCtx = document.createElement("canvas").getContext("2d")!;
          dummyCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
          const lines = text.split("\n");
          let maxWidth = 0;
          lines.forEach((l) => {
            maxWidth = Math.max(maxWidth, dummyCtx.measureText(l).width);
          });

          const el: SketchElement = {
            id: crypto.randomUUID(),
            tool: "text",
            seed: 1,
            x1: canvasPos.x,
            y1: canvasPos.y + yOffset,
            x2: canvasPos.x + maxWidth,
            y2: canvasPos.y + yOffset + lines.length * fontSize * LINE_HEIGHT,
            strokeColor,
            fillColor: "none",
            fillStyle: "none",
            strokeWidth,
            text,
            fontFamily,
            fontSize,
            fontWeight,
          };
          elements.current = [...elements.current, el];
          history.current.push(elements.current);
          syncHistoryStatus();
          renderScene();
        },
      });
      return;
    }

    if (tool === "select") {
      // Check resize handles first, then dragging the already-selected element
      if (selectedElement.current) {
        const pad = 6 / zoom.current;
        const hi = hitTestHandle(
          selectedElement.current,
          point,
          pad,
          zoom.current,
        );
        if (hi !== null) {
          resizeHandle.current = hi;
          resizeOrigin.current = { ...selectedElement.current };
          return;
        }
        if (hitTestElement(selectedElement.current, point, 8 / zoom.current)) {
          isDragging.current = true;
          dragStart.current = point;
          return;
        }
      }

      const hit = [...elements.current]
        .reverse()
        .find((el) => hitTestElement(el, point, 8 / zoom.current));

      if (hit) {
        // Commit previously selected before selecting new one
        if (selectedElement.current && selectedElement.current.id !== hit.id) {
          elements.current = [...elements.current, selectedElement.current];
        }
      selectedElement.current = { ...hit };
      setSelectedTool(hit.tool);
      setStrokeColor(hit.strokeColor);
      setFillColor(hit.fillColor);
      setFillStyle(hit.fillStyle);
      setStrokeWidth(hit.strokeWidth);
      isDragging.current = true;
      dragStart.current = point;
        elements.current = elements.current.filter((el) => el.id !== hit.id);
        if (hit.tool === "text") {
          if (hit.fontFamily) setFontFamily(hit.fontFamily);
          if (hit.fontSize) setFontSize(hit.fontSize);
          if (hit.fontWeight) setFontWeight(hit.fontWeight);
        }
        renderScene();
        renderSelection();
      } else {
        if (selectedElement.current) {
          elements.current = [...elements.current, selectedElement.current];
          history.current.push(elements.current);
          syncHistoryStatus();
          renderScene();
        }
        selectedElement.current = null;
        setSelectedTool(null);
        isDragging.current = false;
        renderSelection();
      }
      return;
    }

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
      points:
        tool === "freehand" || tool === "highlighter" ? [point] : undefined,
      opacity: tool === "highlighter" ? 0.35 : undefined,
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

    if (
      tool === "select" &&
      resizeHandle.current !== null &&
      selectedElement.current &&
      resizeOrigin.current
    ) {
      const point = screenToCanvas(screenPoint);
      const updated = applyResize(
        resizeOrigin.current,
        resizeHandle.current,
        point,
      );

      if (updated.tool === "text") {
        // Recalculate height based on new width and wrapping
        const LINE_HEIGHT = 1.2;
        const fs = updated.fontSize ?? fontSize;
        const ff = updated.fontFamily ?? fontFamily;
        const fw = updated.fontWeight ?? fontWeight;
        const dummyCtx = document.createElement("canvas").getContext("2d")!;
        dummyCtx.font = `${fw} ${fs}px ${ff}`;
        const maxWidth = Math.abs(updated.x2 - updated.x1);

        // Use wrapText logic (we'd ideally share this function)
        const wrap = (text: string, maxW: number) => {
          const lines: string[] = [];
          text.split("\n").forEach((para) => {
            let line = "";
            para.split(" ").forEach((word) => {
              const test = line ? `${line} ${word}` : word;
              if (dummyCtx.measureText(test).width > maxW && line) {
                lines.push(line);
                line = word;
              } else {
                line = test;
              }
            });
            lines.push(line);
          });
          return lines;
        };

        const lines = wrap(updated.text ?? "", maxWidth);
        updated.y2 = updated.y1 + lines.length * fs * LINE_HEIGHT;
      }

      selectedElement.current = updated;
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(renderSelection);
      return;
    }

    if (tool === "select" && isDragging.current && selectedElement.current) {
      const point = screenToCanvas(screenPoint);
      const dx = point.x - dragStart.current.x;
      const dy = point.y - dragStart.current.y;
      dragStart.current = point;
      const el = selectedElement.current;
      selectedElement.current = {
        ...el,
        x1: el.x1 + dx,
        y1: el.y1 + dy,
        x2: el.x2 + dx,
        y2: el.y2 + dy,
        points: el.points?.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      };
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(renderSelection);
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

    if (tool === "select") {
      if (resizeHandle.current !== null) {
        resizeHandle.current = null;
        resizeOrigin.current = null;
        if (selectedElement.current) {
          history.current.push([...elements.current, selectedElement.current]);
          syncHistoryStatus();
        }
        return;
      }
      isDragging.current = false;
      if (selectedElement.current) {
        history.current.push([...elements.current, selectedElement.current]);
        syncHistoryStatus();
        renderSelection();
      }
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
      currentElement.current = null;
      history.current.push(elements.current);
      syncHistoryStatus();
      renderScene();
      clearInteractionCanvas();
      return;
    }

    const justCreated = currentElement.current!;
    elements.current = [...elements.current, justCreated];
    history.current.push(elements.current);
    syncHistoryStatus();
    currentElement.current = null;

    if (tool === "freehand" || tool === "highlighter") {
      renderScene();
      clearInteractionCanvas();
      return;
    }

    selectedElement.current = justCreated;
    setSelectedTool(justCreated.tool);
    elements.current = elements.current.filter(
      (el) => el.id !== justCreated.id,
    );
    setTool("select");
    renderScene();
    renderSelection();
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
    renderSelection();
  }

  function startPanning() {
    isPanning.current = true;
  }
  function stopPanning() {
    isPanning.current = false;
  }

  function onDoubleClick(screenPoint: Point) {
    const point = screenToCanvas(screenPoint);

    // Find which element was double-clicked (check selected first, then scene)
    let target: SketchElement | null = null;
    if (
      selectedElement.current &&
      hitTestElement(selectedElement.current, point, 8 / zoom.current)
    ) {
      target = selectedElement.current;
    } else {
      const hit = [...elements.current]
        .reverse()
        .find((el) => hitTestElement(el, point, 8 / zoom.current));
      if (hit) {
        // Select it
        if (selectedElement.current) {
          elements.current = [...elements.current, selectedElement.current];
        }
        selectedElement.current = { ...hit };
        setSelectedTool(hit.tool);
        elements.current = elements.current.filter((el) => el.id !== hit.id);
        renderScene();
        renderSelection();
        target = selectedElement.current;
      }
    }

    if (!target) return;

    if (target.tool === "text") {
      const LINE_HEIGHT = 1.2;
      const targetFontSize = target.fontSize ?? fontSize;
      const targetFontFamily = target.fontFamily ?? fontFamily;
      const targetFontWeight = target.fontWeight ?? fontWeight;
      const yOffset = ((LINE_HEIGHT - 1) / 2) * targetFontSize;

      const canvasPos = { x: target.x1, y: target.y1 - yOffset };
      const screenPos = canvasToScreen(canvasPos);

      // Remove from elements immediately to prevent "ghosting" while editing
      elements.current = elements.current.filter((el) => el.id !== target!.id);
      selectedElement.current = null;
      setSelectedTool(null);
      renderScene();

      openTextEditor({
        screenPos,
        canvasPos,
        fontSize: targetFontSize,
        color: target.strokeColor,
        zoom: zoom.current,
        initialText: target.text,
        fontFamily: targetFontFamily,
        fontWeight: targetFontWeight,
        onCommit: (text, committedCanvasPos) => {
          if (!text.trim()) {
            renderScene();
            clearInteractionCanvas();
            history.current.push(elements.current);
            syncHistoryStatus();
            return;
          }

          const dummyCtx = document.createElement("canvas").getContext("2d")!;
          dummyCtx.font = `${targetFontWeight} ${targetFontSize}px ${targetFontFamily}`;
          const lines = text.split("\n");
          let maxWidth = 0;
          lines.forEach((l) => {
            maxWidth = Math.max(maxWidth, dummyCtx.measureText(l).width);
          });

          const updated = {
            ...target,
            text,
            x1: committedCanvasPos.x,
            y1: committedCanvasPos.y + yOffset,
            x2: committedCanvasPos.x + maxWidth,
            y2:
              committedCanvasPos.y +
              yOffset +
              lines.length * targetFontSize * LINE_HEIGHT,
          };

          selectedElement.current = updated;
          setSelectedTool(updated.tool);
          renderScene();
          renderSelection();
          history.current.push([...elements.current, updated]);
          syncHistoryStatus();
        },
      });
    } else if (
      target.tool !== "image" &&
      target.tool !== "eraser" &&
      target.tool !== "line"
    ) {
      // Label inside shape: textarea in canvas units, transform: scale(zoom) handles display
      const { x, y, w, h } = getBoundingBox(target);
      const screenPos = canvasToScreen({ x, y });

      // Remove from elements immediately to prevent "ghosting" while editing
      elements.current = elements.current.filter((el) => el.id !== target!.id);
      selectedElement.current = null;
      setSelectedTool(null);
      renderScene();

      openTextEditor({
        screenPos,
        canvasPos: { x, y },
        fontSize: target.fontSize ?? fontSize,
        color: target.strokeColor,
        zoom: zoom.current,
        initialText: target.text,
        containerSize: { w, h },
        fontFamily: target.fontFamily ?? fontFamily,
        fontWeight: target.fontWeight ?? fontWeight,
        onCommit: (text) => {
          const updated = {
            ...target,
            text: text.trim() || undefined,
          };
          selectedElement.current = updated;
          setSelectedTool(updated.tool);
          renderScene();
          renderSelection();
          history.current.push([...elements.current, updated]);
          syncHistoryStatus();
        },
      });
    }
  }

  function placeImage(
    src: string,
    naturalW: number,
    naturalH: number,
    screenDropPoint: Point,
  ) {
    const dropPoint = screenToCanvas(screenDropPoint);
    const maxW = 500 / zoom.current;
    const scale = naturalW > maxW ? maxW / naturalW : 1;
    const w = naturalW * scale;
    const h = naturalH * scale;
    const el: SketchElement = {
      id: crypto.randomUUID(),
      tool: "image",
      seed: 1,
      x1: dropPoint.x - w / 2,
      y1: dropPoint.y - h / 2,
      x2: dropPoint.x + w / 2,
      y2: dropPoint.y + h / 2,
      strokeColor: "none",
      fillColor: "none",
      fillStyle: "none",
      strokeWidth: 0,
      src,
    };
    elements.current = [...elements.current, el];
    history.current.push(elements.current);
    syncHistoryStatus();
    renderScene();
  }

  function handleImageFile(file: File, screenDropPoint: Point) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () =>
        placeImage(src, img.naturalWidth, img.naturalHeight, screenDropPoint);
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function handleImageUrl(url: string, screenDropPoint: Point) {
    const img = new Image();
    img.onload = () =>
      placeImage(url, img.naturalWidth, img.naturalHeight, screenDropPoint);
    img.onerror = () => console.warn("Could not load image:", url);
    img.src = url;
  }

  function handleDrop(e: DragEvent, screenPoint: Point) {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt) return;

    // 1. File from OS (Finder/Explorer drag)
    if (dt.files.length) {
      for (const file of dt.files) {
        if (file.type.startsWith("image/")) {
          handleImageFile(file, screenPoint);
          return;
        }
      }
    }

    // 2. File item (browser-to-browser drag in some browsers)
    for (const item of dt.items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          handleImageFile(file, screenPoint);
          return;
        }
      }
    }

    // 3. Extract URL from HTML (most reliable for browser-to-browser drag)
    //    Chrome puts <img src="..."> in text/html when dragging an image
    const html = dt.getData("text/html");
    if (html) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const imgEl = doc.querySelector("img");
      const src = imgEl?.src || imgEl?.getAttribute("src");
      if (src && /^https?:\/\//.test(src)) {
        handleImageUrl(src, screenPoint);
        return;
      }
    }

    // 4. Direct URL fallback
    const url =
      dt.getData("URL") ||
      dt.getData("text/uri-list") ||
      dt.getData("text/plain");
    if (url && /^https?:\/\//.test(url.trim())) {
      handleImageUrl(url.trim(), screenPoint);
    }
  }

  function updateSelectedStyle(updates: Partial<SketchElement>) {
    if (!selectedElement.current) return;
    selectedElement.current = {
      ...selectedElement.current,
      ...updates,
    };
    history.current.push([...elements.current, selectedElement.current]);
    syncHistoryStatus();
    renderSelection();
  }

  function applyStrokeColor(v: string) {
    setStrokeColor(v);
    updateSelectedStyle({ strokeColor: v });
  }

  function applyFillColor(v: string) {
    setFillColor(v);
    updateSelectedStyle({ fillColor: v });
  }

  function applyFillStyle(v: FillStyle) {
    setFillStyle(v);
    updateSelectedStyle({ fillStyle: v });
  }

  function applyStrokeWidth(v: number) {
    setStrokeWidth(v);
    updateSelectedStyle({ strokeWidth: v });
  }

  function updateTextElementSize(
    el: SketchElement,
    updates: Partial<SketchElement>,
  ) {
    const next = { ...el, ...updates };
    const LINE_HEIGHT = 1.2;
    const fs = next.fontSize ?? fontSize;
    const ff = next.fontFamily ?? fontFamily;
    const fw = next.fontWeight ?? fontWeight;

    const dummyCtx = document.createElement("canvas").getContext("2d")!;
    dummyCtx.font = `${fw} ${fs}px ${ff}`;
    const lines = (next.text ?? "").split("\n");
    let maxWidth = 0;
    lines.forEach((l) => {
      maxWidth = Math.max(maxWidth, dummyCtx.measureText(l).width);
    });

    return {
      ...next,
      x2: next.x1 + maxWidth,
      y2: next.y1 + lines.length * fs * LINE_HEIGHT,
    };
  }

  function applyFontFamily(v: string) {
    setFontFamily(v);
    if (selectedElement.current) {
      if (selectedElement.current.tool === "text") {
        selectedElement.current = updateTextElementSize(
          selectedElement.current,
          {
            fontFamily: v,
          },
        );
      } else if (selectedElement.current.text) {
        selectedElement.current = { ...selectedElement.current, fontFamily: v };
      }
      renderSelection();
      renderScene();
    }
  }

  function applyFontSize(v: number) {
    setFontSize(v);
    if (selectedElement.current) {
      if (selectedElement.current.tool === "text") {
        selectedElement.current = updateTextElementSize(
          selectedElement.current,
          {
            fontSize: v,
          },
        );
      } else if (selectedElement.current.text) {
        selectedElement.current = { ...selectedElement.current, fontSize: v };
      }
      renderSelection();
      renderScene();
    }
  }

  function applyFontWeight(v: "normal" | "bold") {
    setFontWeight(v);
    if (selectedElement.current) {
      if (selectedElement.current.tool === "text") {
        selectedElement.current = updateTextElementSize(
          selectedElement.current,
          {
            fontWeight: v,
          },
        );
      } else if (selectedElement.current.text) {
        selectedElement.current = { ...selectedElement.current, fontWeight: v };
      }
      renderSelection();
      renderScene();
    }
  }

  function editSelected() {
    const el = selectedElement.current;
    if (!el) return;
    if (el.tool === "text") {
      const screenPos = canvasToScreen({ x: el.x1, y: el.y1 });
      onDoubleClick(screenPos);
    } else if (el.tool !== "image" && el.tool !== "eraser") {
      const { x, y, w, h } = getBoundingBox(el);
      const screenPos = canvasToScreen({ x: x + w / 2, y: y + h / 2 });
      onDoubleClick(screenPos);
    }
  }

  function undo() {
    const previous = history.current.undo();
    if (previous === null) return;
    elements.current = previous;
    selectedElement.current = null;
    setSelectedTool(null);
    syncHistoryStatus();
    renderScene();
    clearInteractionCanvas();
  }

  function redo() {
    const next = history.current.redo();
    if (next === null) return;
    elements.current = next;
    selectedElement.current = null;
    setSelectedTool(null);
    syncHistoryStatus();
    renderScene();
    clearInteractionCanvas();
  }

  return {
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
    deleteSelected,
    deselect,
    getCursorForPoint,
    handleDrop,
    onDoubleClick,
    editSelected,
    renderScene,
    renderSelection,
  };
}
