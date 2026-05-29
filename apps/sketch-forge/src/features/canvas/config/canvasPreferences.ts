export const CANVAS_THEME_DEFAULTS = {
  light: {
    backgroundColor: "#f9f9f7",
    patternColor: "#dddfe8",
  },
  dark: {
    backgroundColor: "#111012",
    patternColor: "#27242c",
  },
} as const;

export const getCanvasPrefsKey = (pageId: string | null) =>
  `sketch-forge-canvas-prefs-${pageId ?? "default"}`;
