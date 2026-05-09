"use client";

import { useEffect, useRef, useState } from "react";
import { SketchCanvas } from "./_components/SketchCanvas";
import { Toolbar } from "./_components/Toolbar";
import { useSketchEngine } from "./_hooks/useSketchEngine";
import { BackgroundPicker } from "./_components/BackgroundPicker";
import { StylePanel } from "./_components/StylePannel";

export default function CanvasPage() {
  const [background, setBackground] = useState<"plain" | "dots" | "grid">(
    "dots",
  );
  const [isPanningMode, setIsPanningMode] = useState(false);

  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null);
  const {
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
    zoomLevel,
    panOffsetDisplay,
    onPointerDown,
    onPointerMove,
    finalizeElement,
    handleZoom,
    isPanningRef,
    stopPanning,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSketchEngine(sceneCanvasRef, interactiveCanvasRef);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key === "z") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (e.code == "Space" && !e.repeat) {
        e.preventDefault();
        isPanningRef.current = true;
        setIsPanningMode(true);
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        isPanningRef.current = false;
        setIsPanningMode(false);
        stopPanning();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={getBackgroundStyle(background, zoomLevel / 100, panOffsetDisplay)}
    >
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <StylePanel
        tool={tool}
        strokeColor={strokeColor}
        fillColor={fillColor}
        fillStyle={fillStyle}
        strokeWidth={strokeWidth}
        onStrokeColor={setStrokeColor}
        onFillColor={setFillColor}
        onFillStyle={setFillStyle}
        onStrokeWidth={setStrokeWidth}
      />
      <SketchCanvas
        sceneCanvasRef={sceneCanvasRef}
        interactionCanvasRef={interactiveCanvasRef}
        isPanning={isPanningMode}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finalizeElement}
        onZoom={handleZoom}
      />
      <BackgroundPicker background={background} onChange={setBackground} />
      <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-[oklch(0.18_0.012_260)] shadow-[0_4px_16px_oklch(0_0_0/0.35)]">
        <span className="text-[11px] font-medium tabular-nums text-[oklch(0.65_0.01_260)]">
          {zoomLevel}%
        </span>
      </div>
    </div>
  );
}

function getBackgroundStyle(
  bg: "plain" | "dots" | "grid",
  zoom: number,
  pan: { x: number; y: number },
): React.CSSProperties {
  const base = { backgroundColor: "oklch(0.97 0.003 260)" };

  const size = 10 * zoom;
  const posX = pan.x % size;
  const posY = pan.y % size;

  if (bg === "dots")
    return {
      ...base,
      backgroundImage:
        "radial-gradient(circle, oklch(0.68 0.012 260) 1.5px, transparent 1.5px)",
      backgroundSize: "20px 20px",
      backgroundPosition: `${posX}px ${posY}px`,
    };
  if (bg === "grid")
    return {
      ...base,
      backgroundImage: `
      linear-gradient(oklch(0.85 0.01 260) 1px, transparent 1px),
      linear-gradient(90deg, oklch(0.85 0.01 260) 1px, transparent 1px)
    `,
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: `${posX}px ${posY}px`,
    };

  return base;
}
