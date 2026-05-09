"use client";

import { useRef } from "react";
import { SketchCanvas } from "./_components/SketchCanvas";
import { Toolbar } from "./_components/Toolbar";
import { useSketchEngine } from "./_hooks/useSketchEngine";

export default function CanvasPage() {
  const sceneCavasRef = useRef<HTMLCanvasElement>(null);
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null);
  const { tool, setTool, onPointerDown, onPointerMove, finalizeElement } =
    useSketchEngine(sceneCavasRef, interactiveCanvasRef);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white">
      <Toolbar tool={tool} onToolChange={setTool} />
      <SketchCanvas
        sceneCanvasRef={sceneCavasRef}
        interactiveCanvasRef={interactiveCanvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finalizeElement}
      />
    </div>
  );
}
