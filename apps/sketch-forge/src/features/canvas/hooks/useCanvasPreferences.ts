"use client";

import { useEffect, useRef, useState } from "react";
import { isColorDark } from "@repo/canvas-core/colorUtils";
import { CANVAS_THEME_DEFAULTS } from "../config/canvasPreferences";
import type { CanvasBackground, CanvasMode } from "../types";

interface UseCanvasPreferencesOptions {
  storageKey: string;
  initialMode: CanvasMode;
}

export function useCanvasPreferences({
  storageKey,
  initialMode,
}: UseCanvasPreferencesOptions) {
  const initialCanvasMode = useRef(initialMode);
  const [background, setBackground] = useState<CanvasBackground>("grid");
  const [backgroundColor, setBackgroundColor] = useState("#f9f9f7");
  const [gridColor, setGridColor] = useState("#dddfe8");
  const [dotColor, setDotColor] = useState("#dddfe8");
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("light");
  const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
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
        setHasLoadedPrefs(true);
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
      setHasLoadedPrefs(true);
    } catch {
      setHasLoadedPrefs(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoadedPrefs) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ background, backgroundColor, gridColor, dotColor }),
    );
  }, [
    hasLoadedPrefs,
    storageKey,
    background,
    backgroundColor,
    gridColor,
    dotColor,
  ]);

  return {
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
  };
}
