"use client";

import { RefObject, useEffect } from "react";
import { Point } from "@repo/canvas-core/types";

interface SketchCanvasProps {
  sceneCanvasRef: RefObject<HTMLCanvasElement | null>;
  interactionCanvasRef: RefObject<HTMLCanvasElement | null>;
  onPointerDown: (p: Point) => void;
  onPointerMove: (p: Point) => void;
  onPointerUp: () => void;
  onZoom: (delta: number, p: Point) => void;
  getCursorForPoint: (p: Point) => string;
  onDrop: (e: DragEvent, p: Point) => void;
  onDoubleClick: (p: Point) => void;
  renderScene: () => void;
  renderSelection: () => void;
}

export function SketchCanvas({
  sceneCanvasRef,
  interactionCanvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onZoom,
  getCursorForPoint,
  onDrop,
  onDoubleClick,
  renderScene,
  renderSelection,
}: SketchCanvasProps) {
  useEffect(() => {
    const resize = () => {
      [sceneCanvasRef, interactionCanvasRef].forEach((ref) => {
        if (ref.current) {
          const canvas = ref.current;
          const dpr = window.devicePixelRatio || 1;
          const { width, height } = canvas.getBoundingClientRect();
          canvas.width = width * dpr;
          canvas.height = height * dpr;
        }
      });
      renderScene();
      renderSelection();
    };

    window.addEventListener("resize", resize);
    resize();
    return () => window.removeEventListener("resize", resize);
  }, [sceneCanvasRef, interactionCanvasRef, renderScene, renderSelection]);

  return (
    <div
      className="absolute inset-0 w-full h-full touch-none"
      onPointerDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onPointerDown({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        onPointerMove(p);
        e.currentTarget.style.cursor = getCursorForPoint(p);
      }}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const delta = e.deltaY * -0.001;
        onZoom(delta, p);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onDrop(e.nativeEvent, {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }}
      onDoubleClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onDoubleClick({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      <canvas
        ref={sceneCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />
      <canvas
        ref={interactionCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
