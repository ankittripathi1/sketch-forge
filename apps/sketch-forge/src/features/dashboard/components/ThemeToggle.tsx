"use client";

import { Sun, Moon } from "lucide-react";
import { useAppTheme } from "@/theme/ThemeProvider";

export function ThemeToggle({
  isCollapsed = false,
}: {
  isCollapsed?: boolean;
}) {
  const { resolvedTheme, setTheme, mounted } = useAppTheme();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all
        bg-surface-raised border border-border-default text-text-body
        hover:bg-surface-hover hover:text-text-primary active:scale-[0.97]
        ${isCollapsed ? "justify-center px-0" : ""}`}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun size={18} className="text-accent flex-shrink-0" />
      ) : (
        <Moon size={18} className="text-accent flex-shrink-0" />
      )}
      {!isCollapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
    </button>
  );
}
