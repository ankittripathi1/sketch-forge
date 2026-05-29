"use client";

import { Moon, Sun } from "lucide-react";
import * as React from "react";
import { useAppTheme } from "./ThemeProvider";

type ThemeSelectorProps = {
  isCollapsed?: boolean;
};

export function ThemeSelector({ isCollapsed }: ThemeSelectorProps) {
  const { resolvedTheme, setTheme, mounted } = useAppTheme();

  const isDark = mounted && resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  const toggle = () => {
    if (!mounted) return;
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      suppressHydrationWarning
      className={`inline-flex items-center gap-2.5 rounded-lg border border-border-default bg-surface-raised text-xs font-medium text-text-body shadow-elev-1 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-hover hover:text-text-primary active:translate-y-0 active:scale-[0.98] ${
        isCollapsed ? "h-9 w-9 justify-center" : "px-3 py-2.5"
      }`}
      title={label}
    >
      <Icon size={17} className="text-accent" strokeWidth={2} />
      {!isCollapsed && <span>{isDark ? "Light" : "Dark"}</span>}
    </button>
  );
}
