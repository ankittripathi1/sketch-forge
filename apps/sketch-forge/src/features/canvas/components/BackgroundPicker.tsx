"use client";

import {
  Grip,
  Grid2X2,
  Moon,
  Palette,
  Pipette,
  Square,
  Sun,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

type Background = "plain" | "dots" | "grid";

interface BackgroundPickerProps {
  background: Background;
  backgroundColor: string;
  gridColor: string;
  dotColor: string;
  onChange: (bg: Background) => void;
  onBackgroundColor: (color: string) => void;
  onGridColor: (color: string) => void;
  onDotColor: (color: string) => void;
  canvasMode: "light" | "dark";
  /** Called when a preset theme is applied; isDark reflects the new paper color. */
  onThemeApplied?: (isDark: boolean) => void;
}

// ─── Theme definitions ──────────────────────────────────────────────────────

const LIGHT_THEMES = [
  { label: "Paper", paper: "#f9f9f7", pattern: "#dddfe8" },
  { label: "Warm", paper: "#fef6e4", pattern: "#ead9a8" },
  { label: "Sage", paper: "#f1f8f2", pattern: "#b8d9c3" },
  { label: "Sky", paper: "#f0f6ff", pattern: "#bad6f7" },
  { label: "Rose", paper: "#fef1f4", pattern: "#f2bcc9" },
  { label: "Linen", paper: "#f7f2ea", pattern: "#ddd0b8" },
] as const;

const DARK_THEMES = [
  { label: "Noir", paper: "#111012", pattern: "#27242c" },
  { label: "Ink", paper: "#111722", pattern: "#273246" },
  { label: "Pine", paper: "#111a16", pattern: "#294137" },
  { label: "Aubergine", paper: "#17121f", pattern: "#342948" },
  { label: "Umber", paper: "#1b1411", pattern: "#3a2a22" },
  { label: "Deep Sea", paper: "#0d1a20", pattern: "#21404b" },
] as const;

const BG_OPTIONS = [
  {
    value: "plain" as Background,
    label: "Plain",
    icon: <Square size={13} strokeWidth={1.6} />,
  },
  {
    value: "dots" as Background,
    label: "Dots",
    icon: <Grip size={13} strokeWidth={1.6} />,
  },
  {
    value: "grid" as Background,
    label: "Grid",
    icon: <Grid2X2 size={13} strokeWidth={1.6} />,
  },
];

// ─── Mini preview helper ─────────────────────────────────────────────────────

function getPreviewStyle(
  bg: Background,
  paper: string,
  pattern: string,
): React.CSSProperties {
  if (bg === "grid") {
    return {
      backgroundColor: paper,
      backgroundImage: `
        linear-gradient(${pattern} 1px, transparent 1px),
        linear-gradient(90deg, ${pattern} 1px, transparent 1px)`,
      backgroundSize: "10px 10px",
    };
  }
  if (bg === "dots") {
    return {
      backgroundColor: paper,
      backgroundImage: `radial-gradient(circle, ${pattern} 1.2px, transparent 1.2px)`,
      backgroundSize: "8px 8px",
    };
  }
  return { backgroundColor: paper };
}

// ─── Luminance helper (inline, no external import) ────────────────────────────

function isDarkColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BackgroundPicker({
  background,
  backgroundColor,
  gridColor,
  dotColor,
  onChange,
  onBackgroundColor,
  onGridColor,
  onDotColor,
  canvasMode,
  onThemeApplied,
}: BackgroundPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activePatternColor = background === "dots" ? dotColor : gridColor;
  const updatePatternColor = background === "dots" ? onDotColor : onGridColor;

  const visibleThemes = canvasMode === "dark" ? DARK_THEMES : LIGHT_THEMES;

  function applyTheme(paper: string, pattern: string) {
    onBackgroundColor(paper);
    onGridColor(pattern);
    onDotColor(pattern);
    onThemeApplied?.(isDarkColor(paper));
  }

  function switchMode(next: "light" | "dark") {
    if (next === canvasMode) return;
    const first = next === "dark" ? DARK_THEMES[0] : LIGHT_THEMES[0];
    applyTheme(first.paper, first.pattern);
  }

  function isThemeActive(paper: string, pattern: string) {
    return (
      backgroundColor.toLowerCase() === paper.toLowerCase() &&
      gridColor.toLowerCase() === pattern.toLowerCase() &&
      dotColor.toLowerCase() === pattern.toLowerCase()
    );
  }

  return (
    <>
      {/* Collapsed trigger */}
      {!isOpen && (
        <button
          type="button"
          title="Canvas appearance"
          onClick={() => setIsOpen(true)}
          className="absolute bottom-4 left-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-border-default bg-surface-raised/90 text-text-secondary shadow-elev-2 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-surface-hover hover:text-text-primary active:translate-y-0"
        >
          <Palette size={16} strokeWidth={1.7} />
        </button>
      )}

      <div
        className={[
          "absolute left-3 right-3 top-16 z-30 flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-raised/92 shadow-elev-4 backdrop-blur-xl",
          isOpen ? "flex" : "hidden",
          "sm:bottom-4 sm:left-4 sm:right-auto sm:top-auto sm:w-64",
        ].join(" ")}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            Canvas
          </span>
          <button
            type="button"
            title="Close"
            onClick={() => setIsOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-text-body"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* ── Background type segmented control ── */}
        <div className="px-3 pb-3">
          <div className="flex gap-0.5 rounded-xl bg-surface-sunken p-1">
            {BG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                title={opt.label}
                className={[
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium transition-all duration-150 sm:py-1.5",
                  background === opt.value
                    ? "bg-accent text-accent-text shadow-sm"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-body",
                ].join(" ")}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border-subtle" />

        {/* ── Theme mode switcher + filtered theme grid ── */}
        <div className="px-3 pt-3 pb-3">
          {/* Light / Dark toggle */}
          <div className="mb-3 flex gap-0.5 rounded-xl bg-surface-sunken p-1">
            <button
              onClick={() => switchMode("light")}
              className={[
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium transition-all duration-150",
                canvasMode === "light"
                  ? "bg-[oklch(0.96_0.005_80)] text-[oklch(0.30_0.010_75)] shadow-sm"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-body",
              ].join(" ")}
            >
              <Sun size={12} strokeWidth={2} />
              <span>Light</span>
            </button>
            <button
              onClick={() => switchMode("dark")}
              className={[
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium transition-all duration-150",
                canvasMode === "dark"
                  ? "bg-[oklch(0.18_0.014_75)] text-[oklch(0.82_0.010_80)] shadow-sm"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-body",
              ].join(" ")}
            >
              <Moon size={12} strokeWidth={2} />
              <span>Dark</span>
            </button>
          </div>

          <ThemeGrid
            themes={visibleThemes}
            background={background}
            isActive={isThemeActive}
            onApply={applyTheme}
          />
        </div>

        {/* ── Custom color pickers (only shown for dot/grid) ── */}
        {background !== "plain" && (
          <>
            <div className="h-px bg-border-subtle" />
            <div className="flex flex-col gap-2 px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                Customize
              </p>
              <CustomColorRow
                label="Paper"
                value={backgroundColor}
                onChange={onBackgroundColor}
              />
              <CustomColorRow
                label={background === "dots" ? "Dots" : "Grid"}
                value={activePatternColor}
                onChange={updatePatternColor}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Theme grid sub-component ─────────────────────────────────────────────────

function ThemeGrid({
  themes,
  background,
  isActive,
  onApply,
}: {
  themes: readonly { label: string; paper: string; pattern: string }[];
  background: Background;
  isActive: (paper: string, pattern: string) => boolean;
  onApply: (paper: string, pattern: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {themes.map((theme) => {
        const active = isActive(theme.paper, theme.pattern);
        return (
          <button
            key={theme.label}
            type="button"
            title={`${theme.label} theme`}
            onClick={() => onApply(theme.paper, theme.pattern)}
            className={[
              "group flex flex-col overflow-hidden rounded-xl border transition-all duration-150",
              active
                ? "border-accent shadow-none"
                : "border-[oklch(1_0_0/0.07)] hover:border-[oklch(1_0_0/0.18)]",
            ].join(" ")}
          >
            {/* Mini canvas preview */}
            <div
              className="h-9 w-full sm:h-8"
              style={getPreviewStyle(background, theme.paper, theme.pattern)}
            />
            {/* Label */}
            <div
              className={[
                "px-1.5 py-1 text-center text-[9px] font-semibold leading-none tracking-wide transition-colors",
                active
                  ? "text-accent bg-accent-subtle"
                  : "text-text-secondary bg-surface-raised group-hover:text-text-secondary",
              ].join(" ")}
            >
              {theme.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Custom color picker row ──────────────────────────────────────────────────

function CustomColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-[10px] font-medium text-text-secondary">
        {label}
      </span>
      {/* Current color preview */}
      <div
        className="h-5 flex-1 rounded-md ring-1 ring-[oklch(1_0_0/0.1)]"
        style={{ backgroundColor: value }}
      />
      {/* Custom picker trigger */}
      <button
        type="button"
        title={`Custom ${label.toLowerCase()} color`}
        onClick={() => inputRef.current?.click()}
        className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[conic-gradient(from_90deg,#e05c7a,#e8a830,#5ab98a,#5a8ae8,#a06ae8,#e05c7a)] transition-transform hover:scale-105 sm:h-6 sm:w-6"
      >
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface-hover text-white">
          <Pipette size={9} strokeWidth={2.2} />
        </span>
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          aria-label={`Choose ${label.toLowerCase()} color`}
        />
      </button>
    </div>
  );
}
