"use client";

import { Grip, Grid2X2, Palette, Pipette, Square, X } from "lucide-react";
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
  { label: "Graphite", paper: "#1b1c22", pattern: "#363844" },
  { label: "Midnight", paper: "#0f1828", pattern: "#1e3050" },
  { label: "Noir", paper: "#111012", pattern: "#27242c" },
  { label: "Forest", paper: "#121a13", pattern: "#223524" },
  { label: "Obsidian", paper: "#15121e", pattern: "#2d2648" },
  { label: "Ember", paper: "#1b1210", pattern: "#35241e" },
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
  onThemeApplied,
}: BackgroundPickerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const activePatternColor = background === "dots" ? dotColor : gridColor;
  const updatePatternColor = background === "dots" ? onDotColor : onGridColor;

  function applyTheme(paper: string, pattern: string) {
    onBackgroundColor(paper);
    onGridColor(pattern);
    onDotColor(pattern);
    onThemeApplied?.(isDarkColor(paper));
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
          className="absolute bottom-4 left-4 z-20 flex h-9 w-9 items-center justify-center rounded-xl bg-[oklch(0.18_0.012_260)] text-[oklch(0.72_0.01_260)] shadow-[0_6px_20px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.07)] transition-colors hover:bg-[oklch(0.22_0.012_260)]"
        >
          <Palette size={16} strokeWidth={1.7} />
        </button>
      )}

      <div
        className={[
          "absolute left-3 right-3 top-16 z-30 flex-col rounded-2xl bg-[oklch(0.18_0.012_260)] shadow-[0_12px_40px_oklch(0_0_0/0.48),inset_0_1px_0_oklch(1_0_0/0.08)]",
          isOpen ? "flex" : "hidden",
          "sm:bottom-4 sm:left-4 sm:right-auto sm:top-auto sm:w-60",
        ].join(" ")}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[oklch(0.46_0.008_260)]">
            Canvas
          </span>
          <button
            type="button"
            title="Close"
            onClick={() => setIsOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[oklch(0.5_0.01_260)] transition-colors hover:bg-[oklch(0.25_0.012_260)] hover:text-[oklch(0.8_0.005_260)]"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* ── Background type segmented control ── */}
        <div className="px-3 pb-3">
          <div className="flex rounded-xl bg-[oklch(0.13_0.01_260)] p-1 gap-0.5">
            {BG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                title={opt.label}
                className={[
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium transition-all duration-150 sm:py-1.5",
                  background === opt.value
                    ? "bg-[oklch(0.82_0.14_88)] text-[oklch(0.15_0.01_88)] shadow-sm"
                    : "text-[oklch(0.56_0.01_260)] hover:bg-[oklch(0.22_0.012_260)] hover:text-[oklch(0.82_0.005_260)]",
                ].join(" ")}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-[oklch(1_0_0/0.06)]" />

        {/* ── Light themes ── */}
        <div className="px-3 pt-3 pb-2">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[oklch(0.42_0.008_260)]">
            Light
          </p>
          <ThemeGrid
            themes={LIGHT_THEMES}
            background={background}
            isActive={isThemeActive}
            onApply={applyTheme}
          />
        </div>

        <div className="h-px bg-[oklch(1_0_0/0.06)]" />

        {/* ── Dark themes ── */}
        <div className="px-3 pt-3 pb-3">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[oklch(0.42_0.008_260)]">
            Dark
          </p>
          <ThemeGrid
            themes={DARK_THEMES}
            background={background}
            isActive={isThemeActive}
            onApply={applyTheme}
          />
        </div>

        {/* ── Custom color pickers (only shown for dot/grid) ── */}
        {background !== "plain" && (
          <>
            <div className="h-px bg-[oklch(1_0_0/0.06)]" />
            <div className="flex flex-col gap-2 px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[oklch(0.42_0.008_260)]">
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
                ? "border-[oklch(0.82_0.14_88)] shadow-[0_0_0_1px_oklch(0.82_0.14_88/0.4)]"
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
                  ? "text-[oklch(0.86_0.06_88)] bg-[oklch(0.82_0.14_88/0.12)]"
                  : "text-[oklch(0.52_0.008_260)] bg-[oklch(0.14_0.01_260)] group-hover:text-[oklch(0.72_0.005_260)]",
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
      <span className="w-10 shrink-0 text-[10px] font-medium text-[oklch(0.56_0.01_260)]">
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
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[oklch(0.18_0.012_260)] text-white">
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
