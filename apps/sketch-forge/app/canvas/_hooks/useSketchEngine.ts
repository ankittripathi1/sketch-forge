"use client";

import { RefObject, useRef, useState } from "react";
import rough from "roughjs";
import { DrawingElement, Point, Tool } from "@repo/canvas-core/types";
import { drawElement } from "@repo/canvas-core/renderElement";

export function useSketchEngine(
  sceneCanvasRef: RefObject<HTMLCanvasElement | null>,
  interactionCavasRef: RefObject<HTMLCanvasElement | null>,
) {
  const [tool, setTool] = useState<Tool>("rectangle");
  const elements = useRef<DrawingElement[]>([]);
  const currentElement = useRef<DrawingElement | null>(null);
  const isDrawing = useRef(false);
  const rafId = useRef<number>(0);

  function renderScene() {
    const canvas = sceneCanvasRef!.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rc = rough.canvas(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    elements.current.forEach((el) => drawElement(rc, el));
    if (currentElement.current) drawElement(rc, currentElement.current);
  }

  function renderActiveElement() {
    const canvas = interactionCavasRef!.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rc = rough.canvas(canvas);
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    if (currentElement.current) drawElement(rc, currentElement.current);
  }

  function onPointerDown(point: Point) {
    isDrawing.current = true;
    currentElement.current = {
      id: crypto.randomUUID(),
      tool,
      x1: point.x,
      y1: point.y,
      x2: point.x,
      y2: point.y,
      points: tool === "freehand" ? [point] : undefined,
    };
    renderActiveElement();
  }

  function onPointerMove(point: Point) {
    if (!isDrawing.current || !currentElement.current) return;
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
    if (!isDrawing.current || !currentElement.current) return;
    isDrawing.current = false;
    elements.current = [...elements.current, currentElement.current];
    currentElement.current = null;
    renderScene();
    const canvas = interactionCavasRef!.current;
    if (canvas)
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  return {
    tool,
    setTool,
    onPointerDown,
    onPointerMove,
    finalizeElement,
  };
}
