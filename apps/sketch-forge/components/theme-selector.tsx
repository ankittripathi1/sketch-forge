"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

export function ThemeSelector({ isCollapsed }: { isCollapsed?: boolean }) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme !== "light";

  const toggle = () => {
    if (!mounted) return;
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      suppressHydrationWarning
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all
        bg-surface-raised border border-border-default text-text-body
        hover:bg-surface-hover hover:text-text-primary active:scale-[0.97]
        ${isCollapsed ? "w-9 justify-center px-0" : ""}`}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun
          size={18}
          className="h-[1.2rem] w-[1.2rem] flex-shrink-0 text-accent"
        />
      ) : (
        <Moon
          size={18}
          className="h-[1.2rem] w-[1.2rem] flex-shrink-0 text-accent"
        />
      )}
      {!isCollapsed && <span>{isDark ? "Light" : "Dark"}</span>}
    </button>
  );
}
