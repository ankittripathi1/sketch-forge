"use client";

import { useEffect, useRef, useState } from "react";
import { SketchCanvas } from "./_components/SketchCanvas";
import { Toolbar } from "./_components/Toolbar";
import { useSketchEngine } from "./_hooks/useSketchEngine";
import { BackgroundPicker } from "./_components/BackgroundPicker";
import { StylePanel } from "./_components/StylePannel";
import type { FillStyle } from "@repo/canvas-core/types";

export default function CanvasPage() {
  const [background, setBackground] = useState<"plain" | "dots" | "grid">(
    "grid",
  );
  const [backgroundColor, setBackgroundColor] = useState("#f8f8f6");
  const [gridColor, setGridColor] = useState("#d8dae2");
  const [dotColor, setDotColor] = useState("#a8abb8");
  const [, setIsPanningMode] = useState(false);

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
    selectedTool,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    fontWeight,
    setFontWeight,
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
    deleteSelected,
    deselect,
    getCursorForPoint,
    handleDrop,
    onDoubleClick,
    editSelected,
    renderScene,
    renderSelection,
  } = useSketchEngine(sceneCanvasRef, interactiveCanvasRef);

  function handleFillStyle(style: FillStyle) {
    setFillStyle(style);
    if (style !== "none" && fillColor === "none") {
      setFillColor("#5a8ae8");
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const mod = e.ctrlKey || e.metaKey;

      if (e.key === "Enter" && tool === "select") {
        e.preventDefault();
        editSelected();
        return;
      }

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

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        isPanningRef.current = true;
        setIsPanningMode(true);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        deselect();
        return;
      }

      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case "s":
          setTool("select");
          break;
        case "r":
          setTool("rectangle");
          break;
        case "e":
          setTool("ellipse");
          break;
        case "l":
          setTool("line");
          break;
        case "f":
          setTool("freehand");
          break;
        case "h":
          setTool("highlighter");
          break;
        case "t":
          setTool("text");
          break;
        case "x":
          setTool("eraser");
          break;
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
  }, [
    deleteSelected,
    deselect,
    editSelected,
    isPanningRef,
    redo,
    setTool,
    stopPanning,
    tool,
    undo,
  ]);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={getBackgroundStyle(
        background,
        zoomLevel / 100,
        panOffsetDisplay,
        backgroundColor,
        gridColor,
        dotColor,
      )}
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
        selectedTool={selectedTool}
        strokeColor={strokeColor}
        fillColor={fillColor}
        fillStyle={fillStyle}
        strokeWidth={strokeWidth}
        onStrokeColor={setStrokeColor}
        onFillColor={setFillColor}
        onFillStyle={handleFillStyle}
        onStrokeWidth={setStrokeWidth}
        fontFamily={fontFamily}
        fontSize={fontSize}
        fontWeight={fontWeight}
        onFontFamily={setFontFamily}
        onFontSize={setFontSize}
        onFontWeight={setFontWeight}
      />
      <SketchCanvas
        sceneCanvasRef={sceneCanvasRef}
        interactionCanvasRef={interactiveCanvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finalizeElement}
        onZoom={handleZoom}
        getCursorForPoint={getCursorForPoint}
        onDrop={handleDrop}
        onDoubleClick={onDoubleClick}
        renderScene={renderScene}
        renderSelection={renderSelection}
      />
      {/* Top-left: app name */}
      <div className="absolute left-4 top-4 z-10 hidden select-none items-center gap-2 pointer-events-none sm:flex">
        <span className="text-[13px] font-semibold tracking-tight text-[oklch(0.45_0.01_260)]">
          sketch forge
        </span>
      </div>

      <BackgroundPicker
        background={background}
        backgroundColor={backgroundColor}
        gridColor={gridColor}
        dotColor={dotColor}
        onChange={setBackground}
        onBackgroundColor={setBackgroundColor}
        onGridColor={setGridColor}
        onDotColor={setDotColor}
      />

      {/* Bottom-right: zoom */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-xl bg-[oklch(0.18_0.012_260)] px-3 py-1.5 shadow-[0_4px_16px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.07)] sm:bottom-4 sm:top-auto">
        <span className="text-[11px] font-medium tabular-nums text-[oklch(0.55_0.01_260)]">
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
  backgroundColor: string,
  gridColor: string,
  dotColor: string,
): React.CSSProperties {
  const base = { backgroundColor };

  const size = 10 * zoom;
  const posX = pan.x % size;
  const posY = pan.y % size;
  const dotSize = 20 * zoom;

  if (bg === "dots")
    return {
      ...base,
      backgroundImage: `radial-gradient(circle, ${dotColor} 1.5px, transparent 1.5px)`,
      backgroundSize: `${dotSize}px ${dotSize}px`,
      backgroundPosition: `${posX}px ${posY}px`,
    };
  if (bg === "grid")
    return {
      ...base,
      backgroundImage: `
      linear-gradient(${gridColor} 1px, transparent 1px),
      linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
    `,
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: `${posX}px ${posY}px`,
    };

  return base;
}
