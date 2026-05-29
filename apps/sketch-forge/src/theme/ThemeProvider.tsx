"use client";

import * as React from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY, type AppTheme } from "./themeConfig";

type ThemeContextValue = {
  theme: AppTheme;
  resolvedTheme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  mounted: boolean;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getStoredTheme(): AppTheme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : DEFAULT_THEME;
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [theme, setThemeState] = React.useState<AppTheme>(DEFAULT_THEME);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const storedTheme = getStoredTheme();
    setThemeState(storedTheme);
    applyTheme(storedTheme);
    setMounted(true);
  }, []);

  const setTheme = React.useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme: theme,
      setTheme,
      mounted,
    }),
    [mounted, setTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const value = React.useContext(ThemeContext);
  if (!value) {
    throw new Error("useAppTheme must be used inside ThemeProvider");
  }
  return value;
}
