"use client";

import { RefObject, useEffect } from "react";
import { Point } from "@repo/canvas-core/types";

interface SketchCanvasProps {
  sceneCanvasRef: RefObject<HTMLCanvasElement | null>;
  interactionCanvasRef: RefObject<HTMLCanvasElement | null>;
  isPanning: boolean;
  onPointerDown: (p: Point) => void;
  onPointerMove: (p: Point) => void;
  onPointerUp: () => void;
  onZoom: (delta: number, cursor: Point) => void;
}

export function SketchCanvas({
  sceneCanvasRef,
  interactionCanvasRef,
  isPanning,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onZoom,
}: SketchCanvasProps) {
  useEffect(() => {
    [sceneCanvasRef, interactionCanvasRef].forEach((ref) => {
      const canvas = ref.current!;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }, [sceneCanvasRef, interactionCanvasRef]);

  useEffect(() => {
    const canvas = interactionCanvasRef.current;
    if (!canvas) return;
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      onZoom(-e.deltaY * 0.001, { x: e.clientX, y: e.clientY });
    }
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [interactionCanvasRef, onZoom]);

  return (
    <div className="absolute inset-0">
      <canvas ref={sceneCanvasRef} className="absolute inset-0" />
      <canvas
        ref={interactionCanvasRef}
        className="absolute inset-0"
        onPointerDown={(e) => onPointerDown({ x: e.clientX, y: e.clientY })}
        onPointerMove={(e) => onPointerMove({ x: e.clientX, y: e.clientY })}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          touchAction: "none",
          cursor: isPanning ? "grab" : "crosshair",
        }}
      />
    </div>
  );
}
