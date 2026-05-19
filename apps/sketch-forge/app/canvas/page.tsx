"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { SketchCanvas } from "./_components/SketchCanvas";
import { Toolbar } from "./_components/Toolbar";
import { CanvasActions } from "./_components/CanvasActions";
import { BackgroundPicker } from "./_components/BackgroundPicker";
import { StylePanel } from "./_components/StylePannel";
import { SettingsPanel } from "./_components/SettingsPanel";
import type { FillStyle } from "@repo/canvas-core/types";
import { isColorDark } from "@repo/canvas-core/colorUtils";
import { useSketchEngine } from "@repo/canvas-engine";
import { useCanvasSync } from "./_hooks/useCanvasSync";
import { NotebookSidebar } from "./_components/NotebookSidebar";
import { Suspense } from "react";
import { Book, ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const CANVAS_THEME_DEFAULTS = {
  light: {
    backgroundColor: "#f9f9f7",
    patternColor: "#dddfe8",
  },
  dark: {
    backgroundColor: "#111012",
    patternColor: "#27242c",
  },
} as const;

interface FolderOption {
  id: string;
  name: string;
  parentId: string | null;
}

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
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CanvasContent />
    </Suspense>
  );
}

function CanvasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const pageId =
    searchParams.get("pageId") ||
    (typeParam === "page" ? searchParams.get("id") : null);
  const isPage = typeParam !== "canvas";
  const canvasPrefsKey = `sketch-forge-canvas-prefs-${pageId ?? "default"}`;

  // ─── Background appearance ─────────────────────────────────────────────────
  const [background, setBackground] = useState<"plain" | "dots" | "grid">(
    "grid",
  );
  const [backgroundColor, setBackgroundColor] = useState("#f9f9f7");
  const [gridColor, setGridColor] = useState("#dddfe8");
  const [dotColor, setDotColor] = useState("#dddfe8");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [folders, setFolders] = useState<FolderOption[]>([]);

  const { resolvedTheme, setTheme } = useTheme();
  const initialCanvasMode = useRef<"light" | "dark">(
    resolvedTheme === "dark" ? "dark" : "light",
  );

  // canvasMode: derived from backgroundColor, drives StylePanel palette order.
  const [canvasMode, setCanvasMode] = useState<"light" | "dark">("light");
  const [hasLoadedCanvasPrefs, setHasLoadedCanvasPrefs] = useState(false);

  // Load persisted canvas settings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(canvasPrefsKey);
      if (!saved) {
        const savedAppTheme = localStorage.getItem("sketch-forge-theme");
        const mode =
          savedAppTheme === "dark" || savedAppTheme === "light"
            ? savedAppTheme
            : initialCanvasMode.current;
        const defaults = CANVAS_THEME_DEFAULTS[mode];
        setBackgroundColor(defaults.backgroundColor);
        setGridColor(defaults.patternColor);
        setDotColor(defaults.patternColor);
        setCanvasMode(mode);
        setHasLoadedCanvasPrefs(true);
        return;
      }
      const prefs = JSON.parse(saved);
      if (prefs.background) setBackground(prefs.background);
      if (prefs.backgroundColor) {
        setBackgroundColor(prefs.backgroundColor);
        setCanvasMode(isColorDark(prefs.backgroundColor) ? "dark" : "light");
      }
      if (prefs.gridColor) setGridColor(prefs.gridColor);
      if (prefs.dotColor) setDotColor(prefs.dotColor);
      setHasLoadedCanvasPrefs(true);
    } catch {
      setHasLoadedCanvasPrefs(true);
    }
  }, [canvasPrefsKey]);

  // Persist canvas settings whenever they change
  useEffect(() => {
    if (!hasLoadedCanvasPrefs) return;
    localStorage.setItem(
      canvasPrefsKey,
      JSON.stringify({ background, backgroundColor, gridColor, dotColor }),
    );
  }, [
    hasLoadedCanvasPrefs,
    canvasPrefsKey,
    background,
    backgroundColor,
    gridColor,
    dotColor,
  ]);

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
    elements,
    setElements,
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
    textAlign,
    setTextAlign,
    textVerticalAlign,
    setTextVerticalAlign,
    codeLanguage,
    setCodeLanguage,
    copySelectedCode,
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
    duplicateSelected,
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
  } = useSketchEngine(sceneCanvasRef, interactiveCanvasRef, canvasMode);

  const {
    canvasId,
    entityType,
    folderId,
    title,
    setTitle,
    triggerSave,
    isSaving,
    isDirty,
    movePageToFolder,
    saveNow,
  } = useCanvasSync({
    elementsRef: elements,
    setElements,
  });

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [dialogTitle, setDialogTitle] = useState("Untitled");

  useEffect(() => {
    async function fetchFolders() {
      try {
        const response = await fetch("http://localhost:4001/folders", {
          credentials: "include",
        });
        if (response.ok) {
          setFolders(await response.json());
        }
      } catch (error) {
        console.error("Failed to fetch folders:", error);
      }
    }

    fetchFolders();

    const refreshOnPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) fetchFolders();
    };
    window.addEventListener("pageshow", refreshOnPageShow);
    return () => window.removeEventListener("pageshow", refreshOnPageShow);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function handleBack() {
    const dest = folderId ? `/dashboard/folder/${folderId}` : "/dashboard";
    if (isDirty) {
      setDialogTitle(title || "Untitled");
      setPendingNav(dest);
      setShowSaveDialog(true);
    } else {
      router.push(dest);
    }
  }

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
    const nextMode = isDark ? "dark" : "light";
    setCanvasMode(nextMode);
    setTheme(nextMode);
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
    const nextMode = isColorDark(color) ? "dark" : "light";
    setBackgroundColor(color);
    setCanvasMode(nextMode);
    setTheme(nextMode);
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

      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        void copySelectedCode();
        return;
      }

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
        case "d":
          setTool("diamond");
          break;
        case "l":
          setTool("line");
          break;
        case "a":
          setTool("arrow");
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
    copySelectedCode,
    deleteSelected,
    deselect,
    duplicateSelected,
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

      <CanvasActions
        elements={elements.current}
        onBeautify={handleBeautify}
        isBeautifying={isBeautifying}
        hasElements={hasElements}
        hasApiKey={hasApiKey}
        onSettingsClick={() => setIsSettingsOpen(true)}
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
        textAlign={textAlign}
        textVerticalAlign={textVerticalAlign}
        onTextAlign={setTextAlign}
        onTextVerticalAlign={setTextVerticalAlign}
        codeLanguage={codeLanguage}
        onCodeLanguage={setCodeLanguage}
        onCopyCode={copySelectedCode}
        canvasMode={canvasMode}
      />
      <SketchCanvas
        sceneCanvasRef={sceneCanvasRef}
        interactionCanvasRef={interactiveCanvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          finalizeElement();
          triggerSave();
        }}
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
        canvasMode={canvasMode}
        onChange={setBackground}
        onBackgroundColor={handleBackgroundColor}
        onGridColor={setGridColor}
        onDotColor={setDotColor}
        onThemeApplied={handleThemeApplied}
      />

      <NotebookSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="absolute left-4 top-4 z-10 hidden select-none items-center gap-4 sm:flex pointer-events-auto">
        {isPage && (
          <button
            onClick={handleBack}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-surface-raised px-3 text-[11px] font-semibold text-text-secondary hover:text-text-primary shadow-[0_4px_16px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.07)] transition-all"
          >
            <ChevronLeft size={14} />
            <span>Back to folder</span>
          </button>
        )}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
            isSidebarOpen
              ? "bg-accent-subtle text-accent ring-1 ring-accent/30"
              : "bg-surface-raised text-text-secondary hover:text-accent shadow-[0_4px_16px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.07)]"
          }`}
          title="Toggle Notebooks"
        >
          <Book size={18} strokeWidth={2} />
        </button>
        <span className="text-[13px] font-semibold tracking-tight text-text-muted">
          Sketch Forge
        </span>
        <div className="h-4 w-px bg-border-subtle" />
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            triggerSave();
          }}
          onBlur={triggerSave}
          className="bg-transparent text-[13px] font-medium text-text-body outline-none border-none p-0 w-48 focus:text-text-primary transition-colors"
          placeholder="Untitled"
        />
        {entityType === "pages" && (
          <select
            value={folderId ?? ""}
            onChange={(event) =>
              movePageToFolder(event.target.value || null).then((saved) => {
                if (!saved) router.refresh();
              })
            }
            className="h-9 max-w-44 rounded-xl border border-border-default bg-surface-raised px-2 text-[11px] font-medium text-text-secondary outline-none transition-colors hover:text-text-primary focus:border-border-accent"
            title="Save location"
          >
            <option value="">Root dashboard</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        )}
        {isSaving && (
          <span className="text-[10px] text-text-secondary animate-pulse">
            Saving...
          </span>
        )}
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-border-default bg-surface-raised p-6 shadow-2xl">
            <h2 className="mb-1 text-sm font-semibold text-text-primary">
              Save before leaving?
            </h2>
            <p className="mb-4 text-xs text-text-muted">
              Give your canvas a name to save it.
            </p>
            <input
              autoFocus
              value={dialogTitle}
              onChange={(e) => setDialogTitle(e.target.value)}
              className="mb-4 w-full rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              placeholder="Untitled"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveNow(dialogTitle || "Untitled").then(() => {
                    setShowSaveDialog(false);
                    if (pendingNav) router.push(pendingNav);
                  });
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await saveNow(dialogTitle || "Untitled");
                  setShowSaveDialog(false);
                  if (pendingNav) router.push(pendingNav);
                }}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover"
              >
                Save &amp; Exit
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  if (pendingNav) router.push(pendingNav);
                }}
                className="flex-1 rounded-lg border border-border-default px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-hover"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute right-4 top-[72px] z-10 flex items-center gap-2 sm:bottom-4 sm:top-auto">
        {/* Scribble "recognizing" badge */}
        {scribblePending && (
          <div className="flex items-center gap-1.5 rounded-xl bg-surface-raised px-2.5 py-1.5 shadow-[0_4px_16px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.07)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            <span className="text-[10px] font-medium text-text-secondary">
              recognizing
            </span>
          </div>
        )}
        {/* Zoom level */}
        <div className="flex items-center gap-1.5 rounded-xl bg-surface-raised px-3 py-1.5 shadow-[0_4px_16px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.07)]">
          <span className="text-[11px] font-medium tabular-nums text-text-secondary">
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
