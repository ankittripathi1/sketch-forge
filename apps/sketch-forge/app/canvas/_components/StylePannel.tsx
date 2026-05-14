"use client";

import { Pipette, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tool, FillStyle } from "@repo/canvas-core/types";

/**
 * Colors ordered for a light canvas — dark anchors first, light last.
 */
const COLORS_LIGHT = [
  { label: "Black", value: "#1a1a2e" },
  { label: "Gray", value: "#6c7086" },
  { label: "Red", value: "#e05c7a" },
  { label: "Orange", value: "#e8845a" },
  { label: "Amber", value: "#e8a830" },
  { label: "Green", value: "#5ab98a" },
  { label: "Blue", value: "#5a8ae8" },
  { label: "Purple", value: "#a06ae8" },
  { label: "White", value: "#f5f5f0" },
];

/**
 * Colors ordered for a dark canvas — light anchors first, dark last.
 */
const COLORS_DARK = [
  { label: "White", value: "#e8e6d8" },
  { label: "Light Gray", value: "#b0b3c6" },
  { label: "Red", value: "#e05c7a" },
  { label: "Orange", value: "#e8845a" },
  { label: "Amber", value: "#e8a830" },
  { label: "Green", value: "#5ab98a" },
  { label: "Blue", value: "#5a8ae8" },
  { label: "Purple", value: "#a06ae8" },
  { label: "Black", value: "#1a1a2e" },
];

const FILL_STYLES: { value: FillStyle; label: string; icon: ReactNode }[] = [
  {
    value: "none",
    label: "No fill",
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14">
        <rect
          x="1"
          y="1"
          width="12"
          height="12"
          rx="1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <line
          x1="2"
          y1="12"
          x2="12"
          y2="2"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    ),
  },
  {
    value: "hachure",
    label: "Hachure",
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14">
        <rect
          x="1"
          y="1"
          width="12"
          height="12"
          rx="1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <line
          x1="3"
          y1="11"
          x2="11"
          y2="3"
          stroke="currentColor"
          strokeWidth="1"
        />
        <line
          x1="1"
          y1="9"
          x2="9"
          y2="1"
          stroke="currentColor"
          strokeWidth="1"
        />
        <line
          x1="5"
          y1="13"
          x2="13"
          y2="5"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    ),
  },
  {
    value: "solid",
    label: "Solid",
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14">
        <rect
          x="1"
          y="1"
          width="12"
          height="12"
          rx="1.5"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    ),
  },
];

const WIDTHS = [
  { value: 1.5, label: "Thin", thickness: 1 },
  { value: 3, label: "Medium", thickness: 2.5 },
  { value: 5, label: "Bold", thickness: 4 },
];

const FONTS = [
  { label: "Kalam", value: "Kalam, cursive", group: "Handwriting" },
  {
    label: "Indie Flower",
    value: '"Indie Flower", cursive',
    group: "Handwriting",
  },
  {
    label: "Patrick Hand",
    value: '"Patrick Hand", cursive',
    group: "Handwriting",
  },
  { label: "Inter", value: "Inter, sans-serif", group: "Simple" },
  { label: "Poppins", value: "Poppins, sans-serif", group: "Simple" },
  { label: "Nunito", value: "Nunito, sans-serif", group: "Clean" },
  { label: "Lato", value: "Lato, sans-serif", group: "Clean" },
  { label: "Merriweather", value: "Merriweather, serif", group: "Clean" },
  {
    label: "Courier Prime",
    value: '"Courier Prime", monospace',
    group: "Clean",
  },
];

const RECENT_COLORS_KEY = "sketch-forge:recent-colors";
const MAX_RECENT_COLORS = 5;

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

interface StylePanelProps {
  tool: Tool;
  selectedTool: Tool | null;
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  onStrokeColor: (c: string) => void;
  onFillColor: (c: string) => void;
  onFillStyle: (s: FillStyle) => void;
  onStrokeWidth: (w: number) => void;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  onFontFamily: (v: string) => void;
  onFontSize: (v: number) => void;
  onFontWeight: (v: "normal" | "bold") => void;
  /** Drives which color palette is shown: dark canvas → light-first colors */
  canvasMode?: "light" | "dark";
}

export function StylePanel({
  tool,
  selectedTool,
  strokeColor,
  fillColor,
  fillStyle,
  strokeWidth,
  onStrokeColor,
  onFillColor,
  onFillStyle,
  onStrokeWidth,
  fontFamily,
  fontSize,
  fontWeight,
  onFontFamily,
  onFontSize,
  onFontWeight,
  canvasMode = "light",
}: StylePanelProps) {
  const COLORS = canvasMode === "dark" ? COLORS_DARK : COLORS_LIGHT;
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const activeTool = selectedTool ?? tool;
  // Keep the COLORS variable in scope for the JSX below (derived above in function body)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_COLORS_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentColors(parsed.filter(isHexColor).slice(0, MAX_RECENT_COLORS));
      }
    } catch {
      setRecentColors([]);
    }
  }, []);

  function rememberCustomColor(color: string) {
    if (!isHexColor(color)) return;
    setRecentColors((current) => {
      const next = [
        color,
        ...current.filter((c) => c.toLowerCase() !== color.toLowerCase()),
      ].slice(0, MAX_RECENT_COLORS);
      window.localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function handleStrokeColor(color: string) {
    rememberCustomColor(color);
    onStrokeColor(color);
  }

  function handleFillColor(color: string) {
    rememberCustomColor(color);
    onFillColor(color);
  }

  if (tool === "select" && !selectedTool) return null;
  if (activeTool === "eraser" || activeTool === "image") return null;

  const showFill =
    activeTool !== "line" &&
    activeTool !== "freehand" &&
    activeTool !== "highlighter" &&
    activeTool !== "text";
  const hasTextOptions =
    activeTool === "text" ||
    activeTool === "rectangle" ||
    activeTool === "ellipse";

  return (
    <>
      <button
        type="button"
        title="Style controls"
        onClick={() => setIsOpen(true)}
        className="absolute bottom-19 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-2xl bg-[oklch(0.18_0.012_260)] text-[oklch(0.72_0.01_260)] shadow-[0_6px_20px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.07)] sm:hidden"
      >
        <SlidersHorizontal size={19} strokeWidth={1.7} />
      </button>

      <div
        className={[
          "absolute bottom-19 left-3 right-3 z-30 max-h-[48vh] flex-col gap-3.5 overflow-y-auto overflow-x-hidden rounded-2xl bg-[oklch(0.18_0.012_260)] p-3.5 shadow-[0_8px_32px_oklch(0_0_0/0.45),inset_0_1px_0_oklch(1_0_0/0.07)] scrollbar-hide",
          isOpen ? "flex" : "hidden",
          "sm:bottom-auto sm:left-auto sm:right-3 sm:top-1/2 sm:flex sm:max-h-[90vh] sm:w-41 sm:-translate-y-1/2",
        ].join(" ")}
      >
        <div className="flex items-center justify-between sm:hidden">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[oklch(0.48_0.008_260)]">
            Style
          </span>
          <button
            type="button"
            title="Close style controls"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[oklch(0.58_0.01_260)] hover:bg-[oklch(0.25_0.012_260)]"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {hasTextOptions && (
          <>
            <Section label="Font">
              <select
                value={fontFamily}
                onChange={(e) => onFontFamily(e.target.value)}
                style={{ fontFamily }}
                className="h-8 w-full rounded-lg border border-[oklch(1_0_0/0.08)] bg-[oklch(0.13_0.01_260)] px-2 text-[12px] font-medium text-[oklch(0.82_0.005_260)] outline-none transition-colors hover:bg-[oklch(0.16_0.01_260)] focus:border-[oklch(0.82_0.14_88)]"
              >
                {["Handwriting", "Simple", "Clean"].map((group) => (
                  <optgroup key={group} label={group}>
                    {FONTS.filter((font) => font.group === group).map(
                      (font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ),
                    )}
                  </optgroup>
                ))}
              </select>
            </Section>

            <div className="h-px bg-[oklch(1_0_0/0.07)]" />

            <Section label="Size & Weight">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onFontSize(Math.max(8, fontSize - 2))}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-sm text-[oklch(0.6_0.01_260)] transition-all hover:bg-[oklch(0.25_0.012_260)] hover:text-[oklch(0.88_0.005_260)] sm:h-6 sm:w-6"
                >
                  -
                </button>
                <span className="w-8 text-center text-[12px] font-medium tabular-nums text-[oklch(0.7_0.01_260)] sm:w-6">
                  {fontSize}
                </span>
                <button
                  onClick={() => onFontSize(Math.min(200, fontSize + 2))}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-sm text-[oklch(0.6_0.01_260)] transition-all hover:bg-[oklch(0.25_0.012_260)] hover:text-[oklch(0.88_0.005_260)] sm:h-6 sm:w-6"
                >
                  +
                </button>
                <button
                  onClick={() =>
                    onFontWeight(fontWeight === "bold" ? "normal" : "bold")
                  }
                  className={[
                    "h-9 w-10 rounded-md text-[12px] font-bold transition-all sm:h-6 sm:w-7",
                    fontWeight === "bold"
                      ? "bg-[oklch(0.82_0.14_88)] text-[oklch(0.15_0.01_88)]"
                      : "text-[oklch(0.55_0.01_260)] hover:bg-[oklch(0.25_0.012_260)]",
                  ].join(" ")}
                >
                  B
                </button>
              </div>
            </Section>

            <div className="h-px bg-[oklch(1_0_0/0.07)]" />
          </>
        )}

        <Section label="Stroke">
          <ColorGrid
            colors={COLORS}
            recentColors={recentColors}
            selected={strokeColor}
            onSelect={onStrokeColor}
            onCustomColor={handleStrokeColor}
          />
        </Section>

        {showFill && (
          <>
            <div className="h-px bg-[oklch(1_0_0/0.07)]" />
            <Section label="Fill">
              <div className="flex items-center gap-1">
                {FILL_STYLES.map((fs) => (
                  <button
                    key={fs.value}
                    title={fs.label}
                    onClick={() => onFillStyle(fs.value)}
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-150 sm:h-7 sm:w-8",
                      fillStyle === fs.value
                        ? "bg-[oklch(0.82_0.14_88)] text-[oklch(0.15_0.01_88)]"
                        : "text-[oklch(0.52_0.01_260)] hover:bg-[oklch(0.25_0.012_260)] hover:text-[oklch(0.82_0.005_260)]",
                    ].join(" ")}
                  >
                    {fs.icon}
                  </button>
                ))}
              </div>
            </Section>

            {fillStyle !== "none" && (
              <>
                <div className="h-px bg-[oklch(1_0_0/0.07)]" />
                <Section label="Fill color">
                  <ColorGrid
                    colors={COLORS}
                    recentColors={recentColors}
                    selected={fillColor}
                    onSelect={onFillColor}
                    onCustomColor={handleFillColor}
                  />
                </Section>
              </>
            )}
          </>
        )}

        {activeTool !== "text" && (
          <>
            <div className="h-px bg-[oklch(1_0_0/0.07)]" />
            <Section label="Width">
              <div className="flex items-center gap-1">
                {WIDTHS.map((w) => {
                  const active = strokeWidth === w.value;
                  const activeCls = "bg-[oklch(0.15_0.01_88)]";
                  const inactiveCls = "bg-[oklch(0.6_0.01_260)]";
                  return (
                    <button
                      key={w.value}
                      title={w.label}
                      onClick={() => onStrokeWidth(w.value)}
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-150 sm:h-7 sm:w-8",
                        active
                          ? "bg-[oklch(0.82_0.14_88)]"
                          : "hover:bg-[oklch(0.25_0.012_260)]",
                      ].join(" ")}
                    >
                      <div
                        style={{ height: w.thickness }}
                        className={
                          "w-4 rounded-full " +
                          (active ? activeCls : inactiveCls)
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </Section>
          </>
        )}
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9px] font-semibold tracking-widest uppercase text-[oklch(0.38_0.008_260)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function ColorGrid({
  colors,
  recentColors,
  selected,
  onSelect,
  onCustomColor,
}: {
  colors: typeof COLORS_LIGHT;
  recentColors: string[];
  selected: string;
  onSelect: (v: string) => void;
  onCustomColor: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const knownColors = new Set(colors.map((c) => c.value.toLowerCase()));
  const customSelected =
    isHexColor(selected) &&
    !knownColors.has(selected.toLowerCase()) &&
    !recentColors.some((c) => c.toLowerCase() === selected.toLowerCase());
  const displayColors = [
    ...colors,
    ...recentColors.map((value) => ({ value, label: "Recent color" })),
    ...(customSelected
      ? [{ value: selected, label: "Current custom color" }]
      : []),
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(28px,1fr))] gap-2 sm:grid-cols-6 sm:gap-1.5">
      {displayColors.map((c) => (
        <button
          key={c.value}
          title={c.label}
          onClick={() => onSelect(c.value)}
          style={{ background: c.value }}
          className={[
            "h-7 w-7 justify-self-center rounded-full transition-all duration-100 sm:h-5 sm:w-5",
            selected === c.value
              ? "ring-2 ring-[oklch(0.82_0.14_88)] ring-offset-1 ring-offset-[oklch(0.18_0.012_260)] scale-110"
              : "hover:scale-110",
          ].join(" ")}
        />
      ))}
      <button
        type="button"
        title="Custom color"
        onClick={() => inputRef.current?.click()}
        className="relative flex h-7 w-7 items-center justify-center justify-self-center overflow-hidden rounded-full bg-[conic-gradient(from_90deg,#e05c7a,#e8a830,#5ab98a,#5a8ae8,#a06ae8,#e05c7a)] transition-all duration-100 hover:scale-110 sm:h-5 sm:w-5"
      >
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[oklch(0.18_0.012_260)] text-white">
          <Pipette size={10} strokeWidth={2} />
        </span>
        <input
          ref={inputRef}
          type="color"
          value={isHexColor(selected) ? selected : "#5a8ae8"}
          onChange={(e) => onCustomColor(e.target.value)}
          className="sr-only"
          aria-label="Choose custom color"
        />
      </button>
    </div>
  );
}
