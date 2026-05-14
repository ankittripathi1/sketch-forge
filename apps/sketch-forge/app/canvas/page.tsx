"use client";

import { useEffect, useRef, useState } from "react";
import { SketchCanvas } from "./_components/SketchCanvas";
import { Toolbar } from "./_components/Toolbar";
import { BackgroundPicker } from "./_components/BackgroundPicker";
import { StylePanel } from "./_components/StylePannel";
import { SettingsPanel } from "./_components/SettingsPanel";
import type { FillStyle } from "@repo/canvas-core/types";
import { isColorDark } from "@repo/canvas-core/colorUtils";
import { useSketchEngine } from "@repo/canvas-engine";

/**
 * CanvasPage
 *
 * The root component for the canvas editor.  Its responsibilities are:
 *
 *   1. Owning the background appearance state (pattern type, paper colour,
 *      grid/dot colour) — kept here rather than in the engine because the
 *      background is rendered via CSS on the container div, not on the canvas.
 *
 *   2. Bridging the useSketchEngine hook with the UI panels (Toolbar, StylePanel,
 *      BackgroundPicker, SettingsPanel).  The hook exposes a stable API; this
 *      component wires the right handlers to the right panels.
 *
 *   3. Registering global keyboard shortcuts (undo, redo, tool hotkeys, space
 *      to pan, delete, escape) via a single window-level listener.
 *
 *   4. Deriving lightweight UI state (canvasMode, hasElements, hasApiKey) from
 *      hook values so UI panels don't need direct access to the hook.
 */
export default function CanvasPage() {
  // ─── Background appearance ─────────────────────────────────────────────────
  // These three state values drive the CSS background of the container div.
  // They are kept separate from the engine because the canvas elements
  // themselves are transparent — the background is purely presentational.
  const [background, setBackground] = useState<"plain" | "dots" | "grid">(
    "grid",
  );
  const [backgroundColor, setBackgroundColor] = useState("#f9f9f7");
  const [gridColor, setGridColor] = useState("#dddfe8");
  const [dotColor, setDotColor] = useState("#dddfe8");

  /**
   * canvasMode tracks whether the current background is light or dark.
   * It is derived from backgroundColor whenever the user changes it (see
   * handleBackgroundColor / handleThemeApplied below) and is passed down to:
   *   - StylePanel: to reorder the colour palette (dark canvas → light colours first)
   */
  const [canvasMode, setCanvasMode] = useState<"light" | "dark">("light");

  // setIsPanningMode is intentionally not read — it exists solely to trigger
  // a re-render that updates the cursor when the user holds Space.
  const [, setIsPanningMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Two canvas refs passed into useSketchEngine.  The hook attaches renderers
  // to both but never reads their DOM position — that’s handled here in
  // event callbacks via getBoundingClientRect.
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
    applyThemeColors,
    beautifyLayout,
    isBeautifying,
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
    onPan,
    scribbleEnabled,
    setScribbleEnabled,
    scribblePending,
    recognitionBackend,
    setRecognitionBackend,
    recognitionApiKey,
    setRecognitionApiKey,
  } = useSketchEngine(sceneCanvasRef, interactiveCanvasRef);

  // ─── Derived UI flags ──────────────────────────────────────────────────────

  /**
   * Whether there is anything on the canvas to work with.
   *
   * Elements live inside refs in the hook and don't trigger re-renders, so we
   * can’t read elements.length directly here.  canUndo/canRedo become true the
   * moment the first element is pushed to history, making them a reliable proxy.
   * This drives the disabled state of the Beautify button.
   */
  const hasElements = canUndo || canRedo;

  /**
   * Whether the user has configured a Gemini API key.
   * Used to style the Beautify button: amber (ready) vs grey (needs key).
   */
  const hasApiKey = recognitionApiKey.trim().length > 0;

  // ─── Event handlers ────────────────────────────────────────────────────────

  /**
   * Triggered by the ✨ Beautify toolbar button.
   *
   * Wraps beautifyLayout() (from useSketchEngine) in a try/catch because it
   * is an async function that can throw for two reasons:
   *   - No Gemini API key configured.
   *   - Network or JSON parsing error from getAILayout.
   * Both cases surface an alert so the user knows what went wrong.
   * A production app would replace alert() with a toast notification.
   */
  async function handleBeautify() {
    try {
      await beautifyLayout();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Beautify failed";
      console.error("[beautify]", msg);
      alert(msg);
    }
  }

  /**
   * Called by BackgroundPicker when the user clicks a preset theme swatch.
   *
   * Two things happen simultaneously:
   *   1. canvasMode is updated so StylePanel shows the right colour palette.
   *   2. applyThemeColors() walks every element and recolours those that still
   *      use the old theme’s default stroke — custom colours are left alone.
   *
   * Note: this is NOT called for manual colour-picker changes (see
   * handleBackgroundColor below), because manually picking a dark paper colour
   * should update the palette but should never silently recolour elements.
   */
  function handleThemeApplied(isDark: boolean) {
    setCanvasMode(isDark ? "dark" : "light");
    applyThemeColors(isDark);
  }

  /**
   * Called when the user manually changes the paper colour via the custom
   * colour picker (not a preset theme swatch).
   *
   * We update canvasMode so the StylePanel palette stays in sync, but we
   * deliberately do NOT call applyThemeColors() — a manual background tweak
   * should never overwrite element colours the user might have carefully chosen.
   */
  function handleBackgroundColor(color: string) {
    setBackgroundColor(color);
    setCanvasMode(isColorDark(color) ? "dark" : "light");
  }

  /**
   * Intercepts fill-style changes to ensure a sensible default fill colour.
   *
   * When the user switches from "no fill" to hachure or solid, fillColor is
   * still "none" (the no-fill sentinel).  We auto-set it to a default blue
   * so the shape immediately appears filled rather than showing nothing.
   */
  function handleFillStyle(style: FillStyle) {
    setFillStyle(style);
    if (style !== "none" && fillColor === "none") {
      setFillColor("#5a8ae8");
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
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
        onSettingsClick={() => setIsSettingsOpen(true)}
        onBeautify={handleBeautify}
        isBeautifying={isBeautifying}
        hasElements={hasElements}
        hasApiKey={hasApiKey}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        scribbleEnabled={scribbleEnabled}
        onScribbleChange={setScribbleEnabled}
        recognitionBackend={recognitionBackend}
        onRecognitionBackend={setRecognitionBackend}
        recognitionApiKey={recognitionApiKey}
        onRecognitionApiKey={setRecognitionApiKey}
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
        canvasMode={canvasMode}
      />
      <SketchCanvas
        sceneCanvasRef={sceneCanvasRef}
        interactionCanvasRef={interactiveCanvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finalizeElement}
        onZoom={handleZoom}
        onPan={onPan}
        getCursorForPoint={getCursorForPoint}
        onDrop={handleDrop}
        onDoubleClick={onDoubleClick}
        renderScene={renderScene}
        renderSelection={renderSelection}
      />
      <BackgroundPicker
        background={background}
        backgroundColor={backgroundColor}
        gridColor={gridColor}
        dotColor={dotColor}
        onChange={setBackground}
        onBackgroundColor={handleBackgroundColor}
        onGridColor={setGridColor}
        onDotColor={setDotColor}
        onThemeApplied={handleThemeApplied}
      />

      <div className="absolute left-4 top-4 z-10 hidden select-none items-center gap-2 pointer-events-none sm:flex">
        <span className="text-[13px] font-semibold tracking-tight text-[oklch(0.45_0.01_260)]">
          sketch forge
        </span>
      </div>

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:bottom-4 sm:top-auto">
        {/* Scribble "recognizing" badge */}
        {scribblePending && (
          <div className="flex items-center gap-1.5 rounded-xl bg-[oklch(0.18_0.012_260)] px-2.5 py-1.5 shadow-[0_4px_16px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.07)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[oklch(0.82_0.14_88)]" />
            <span className="text-[10px] font-medium text-[oklch(0.62_0.01_260)]">
              recognizing
            </span>
          </div>
        )}
        {/* Zoom level */}
        <div className="flex items-center gap-1.5 rounded-xl bg-[oklch(0.18_0.012_260)] px-3 py-1.5 shadow-[0_4px_16px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.07)]">
          <span className="text-[11px] font-medium tabular-nums text-[oklch(0.55_0.01_260)]">
            {zoomLevel}%
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Generates the CSS background style for the canvas container div.
 *
 * The background is rendered entirely in CSS (not on the canvas itself) so it
 * can pan and scale without triggering a canvas redraw on every frame.
 *
 * Background position is derived from the current pan offset modulo the tile
 * size, creating an infinite tiling illusion even though the div is finite.
 *
 * @param bg               Which pattern to render: plain / dots / grid.
 * @param zoom             Current zoom level (1.0 = 100%).
 * @param pan              Current pan offset in screen pixels.
 * @param backgroundColor  The paper/fill colour.
 * @param gridColor        Colour of grid lines (used when bg === "grid").
 * @param dotColor         Colour of dot centres (used when bg === "dots").
 */
function getBackgroundStyle(
  bg: "plain" | "dots" | "grid",
  zoom: number,
  pan: { x: number; y: number },
  backgroundColor: string,
  gridColor: string,
  dotColor: string,
): React.CSSProperties {
  const base = { backgroundColor };

  // Base grid cell = 10 canvas units, scaled by current zoom.
  const size = 10 * zoom;
  // Modulo keeps the pattern origin within one tile as the user pans,
  // preventing the offset from growing without bound.
  const posX = pan.x % size;
  const posY = pan.y % size;
  // Dots use a slightly larger cell (20 units) so they feel less dense.
  const dotSize = 20 * zoom;

  if (bg === "dots")
    return {
      ...base,
      // radial-gradient with a hard stop at 1.5px creates crisp circular dots.
      backgroundImage: `radial-gradient(circle, ${dotColor} 1.5px, transparent 1.5px)`,
      backgroundSize: `${dotSize}px ${dotSize}px`,
      backgroundPosition: `${posX}px ${posY}px`,
    };
  if (bg === "grid")
    return {
      ...base,
      // Two orthogonal linear-gradients layered to form a grid.
      backgroundImage: `
      linear-gradient(${gridColor} 1px, transparent 1px),
      linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
    `,
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: `${posX}px ${posY}px`,
    };

  return base; // plain — just the solid background colour
}
