"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  SketchCanvas,
  Toolbar,
  CanvasActions,
  BackgroundPicker,
  StylePanel,
  SettingsPanel,
  NotebookSidebar,
  useCanvasSync,
  useCanvasPreferences,
  useCanvasShortcuts,
  CANVAS_THEME_DEFAULTS,
  getCanvasPrefsKey,
  getBackgroundStyle,
} from "@/features/canvas";
import type { FillStyle } from "@repo/canvas-core/types";
import { isColorDark } from "@repo/common";
import { useSketchEngine, useCanvasUI } from "@repo/canvas-engine";
import {
  Book,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  PanelLeftOpen,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppTheme } from "@/theme/ThemeProvider";

/**
 * `CanvasPage`
 *
 * The root component for the canvas editor. Its responsibilities are:
 *
 *   1. Owning the background appearance state (pattern type, paper colour,
 *      grid/dot `colour`) — kept here rather than in the engine because the
 *      background is rendered via CSS on the container div, not on the canvas.
 *
 *   2. Bridging the `useSketchEngine` hook with the UI panels (Toolbar, StylePanel,
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { resolvedTheme, setTheme } = useAppTheme();
  const {
    background,
    setBackground,
    backgroundColor,
    setBackgroundColor,
    gridColor,
    setGridColor,
    dotColor,
    setDotColor,
    canvasMode,
    setCanvasMode,
    hasLoadedPrefs,
  } = useCanvasPreferences({
    storageKey: getCanvasPrefsKey(pageId),
    initialMode: resolvedTheme === "dark" ? "dark" : "light",
  });

  // setIsPanningMode is intentionally not read — it exists solely to trigger
  // a re-render that updates the cursor when the user holds Space.
  const [, setIsPanningMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Two canvas refs passed into useSketchEngine.  The hook attaches renderers
  // to both but never reads their DOM position — that’s handled here in
  // event callbacks via getBoundingClientRect.
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null);

  const triggerSaveRef = useRef<() => void>(() => {});
  const onEngineChange = useCallback(() => {
    triggerSaveRef.current();
  }, []);

  const {
    elements,
    setElements,
    tool,
    setTool,
    setStrokeColor,
    setFillColor,
    setFillStyle,
    setStrokeWidth,
    selectedTool,
    setFontFamily,
    setFontSize,
    setFontWeight,
    setTextAlign,
    setTextVerticalAlign,
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
  } = useSketchEngine(
    sceneCanvasRef,
    interactiveCanvasRef,
    canvasMode,
    onEngineChange,
  );

  const {
    folderId,
    title,
    setTitle,
    triggerSave,
    isSaving,
    isDirty,
    saveNow,
    lastSavedAt,
    loadVersion,
  } = useCanvasSync({
    elementsRef: elements,
    setElements,
  });

  useEffect(() => {
    triggerSaveRef.current = triggerSave;
  }, [triggerSave]);

  const appThemeSyncKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasLoadedPrefs) return;
    const nextMode = resolvedTheme === "dark" ? "dark" : "light";
    const syncKey = `${nextMode}:${canvasMode}`;
    if (appThemeSyncKeyRef.current === syncKey) return;
    appThemeSyncKeyRef.current = syncKey;
    if (nextMode === canvasMode) {
      applyThemeColors(nextMode === "dark", { recordHistory: false });
      return;
    }

    const defaults = CANVAS_THEME_DEFAULTS[nextMode];
    setBackgroundColor(defaults.backgroundColor);
    setGridColor(defaults.patternColor);
    setDotColor(defaults.patternColor);
    setCanvasMode(nextMode);
    applyThemeColors(nextMode === "dark");
  }, [
    applyThemeColors,
    canvasMode,
    hasLoadedPrefs,
    resolvedTheme,
    setBackgroundColor,
    setCanvasMode,
    setDotColor,
    setGridColor,
  ]);

  const loadedThemeSyncKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasLoadedPrefs || loadVersion === 0) return;
    const syncKey = `${loadVersion}:${canvasMode}`;
    if (loadedThemeSyncKeyRef.current === syncKey) return;
    loadedThemeSyncKeyRef.current = syncKey;
    const changed = applyThemeColors(canvasMode === "dark", {
      recordHistory: false,
    });
    if (changed) {
      triggerSave();
    }
  }, [applyThemeColors, canvasMode, hasLoadedPrefs, loadVersion, triggerSave]);

  useEffect(() => {
    const flushPendingSave = () => {
      if (document.visibilityState === "hidden" && isDirty) {
        void saveNow();
      }
    };
    document.addEventListener("visibilitychange", flushPendingSave);
    return () =>
      document.removeEventListener("visibilitychange", flushPendingSave);
  }, [isDirty, saveNow]);

  async function handleBack() {
    const dest = folderId ? `/dashboard/folder/${folderId}` : "/dashboard";
    if (isDirty) {
      await saveNow(title.trim() || "Untitled");
    }
    router.push(dest);
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
    if (style !== "none" && useCanvasUI.getState().fillColor === "none") {
      setFillColor("#5a8ae8");
    }
  }

  useCanvasShortcuts({
    tool,
    setTool,
    deleteSelected,
    deselect,
    duplicateSelected,
    editSelected,
    isPanningRef,
    redo,
    setIsPanningMode,
    stopPanning,
    undo,
  });

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
        onStrokeColor={setStrokeColor}
        onFillColor={setFillColor}
        onFillStyle={handleFillStyle}
        onStrokeWidth={setStrokeWidth}
        onFontFamily={setFontFamily}
        onFontSize={setFontSize}
        onFontWeight={setFontWeight}
        onTextAlign={setTextAlign}
        onTextVerticalAlign={setTextVerticalAlign}
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

      <div className="pointer-events-auto absolute left-4 top-4 z-20 hidden max-w-[min(34rem,42vw)] select-none items-center gap-1.5 overflow-hidden rounded-xl border border-border-default bg-surface-raised/92 p-1.5 shadow-elev-3 backdrop-blur-xl sm:flex">
        {isPage && (
          <button
            onClick={handleBack}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-text-secondary transition-all hover:-translate-y-0.5 hover:bg-surface-hover hover:text-text-primary active:translate-y-0"
            title={folderId ? "Back to folder" : "Back to dashboard"}
          >
            <ChevronLeft size={14} />
            <span className="hidden 2xl:inline">
              {folderId ? "Folder" : "Dashboard"}
            </span>
          </button>
        )}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all hover:-translate-y-0.5 active:translate-y-0 ${
            isSidebarOpen
              ? "bg-accent-subtle text-accent ring-1 ring-accent/30"
              : "text-text-secondary hover:bg-surface-hover hover:text-accent"
          }`}
          title="Toggle notebook sidebar"
        >
          <PanelLeftOpen size={17} strokeWidth={2} />
        </button>
        <div className="hidden h-5 w-px shrink-0 bg-border-subtle xl:block" />
        <Book size={15} className="hidden shrink-0 text-text-muted xl:block" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => triggerSave()}
          className="min-w-0 flex-1 truncate rounded-md bg-transparent px-1.5 py-1 text-[13px] font-semibold text-text-body outline-none transition-colors placeholder:text-text-dim focus:bg-surface-hover focus:text-text-primary"
          placeholder="Untitled"
        />
        <span className="flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-text-secondary">
          {isSaving ? (
            <>
              <Loader2 size={12} className="animate-spin text-accent" />
              <span className="hidden xl:inline">Saving</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={12} className="text-accent" />
              <span className="hidden xl:inline">
                {lastSavedAt ? "Saved" : "Autosave"}
              </span>
            </>
          )}
        </span>
      </div>

      <div className="absolute right-4 top-[76px] z-10 flex items-center gap-2 sm:bottom-4 sm:top-auto">
        {/* Scribble "recognizing" badge */}
        {scribblePending && (
          <div className="flex items-center gap-1.5 rounded-xl border border-border-default bg-surface-raised/88 px-2.5 py-1.5 shadow-elev-2 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            <span className="text-[10px] font-medium text-text-secondary">
              recognizing
            </span>
          </div>
        )}
        {/* Zoom level */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border-default bg-surface-raised/88 px-3 py-1.5 shadow-elev-2 backdrop-blur-xl">
          <span className="text-[11px] font-medium tabular-nums text-text-secondary">
            {zoomLevel}%
          </span>
        </div>
      </div>
    </div>
  );
}
