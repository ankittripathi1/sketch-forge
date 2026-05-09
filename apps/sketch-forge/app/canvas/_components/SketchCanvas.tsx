"use client";

import { RefObject, useEffect } from "react";
import { Point } from "@repo/canvas-core/types";

interface SketchCanvasProps {
  sceneCanvasRef: RefObject<HTMLCanvasElement | null>;
  interactiveCanvasRef: RefObject<HTMLCanvasElement | null>;
  onPointerDown: (p: Point) => void;
  onPointerMove: (p: Point) => void;
  onPointerUp: () => void;
}

export function SketchCanvas({
  sceneCanvasRef: staticCanvasRef,
  interactiveCanvasRef: dynamicCanvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: SketchCanvasProps) {
  useEffect(() => {
    [staticCanvasRef, dynamicCanvasRef].forEach((ref) => {
      const canvas = ref.current!;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }, [staticCanvasRef, dynamicCanvasRef]);

  return (
    <div className="absolute inset-0">
      <canvas ref={staticCanvasRef} className="absolute inset-0" />
      <canvas
        ref={dynamicCanvasRef}
        className="absolute inset-0"
        onMouseDown={(e) => onPointerDown({ x: e.clientX, y: e.clientY })}
        onMouseMove={(e) => onPointerMove({ x: e.clientX, y: e.clientY })}
        onMouseUp={onPointerUp}
      />
    </div>
  );
}
