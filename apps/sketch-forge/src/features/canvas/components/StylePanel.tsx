"use client";

import { ChevronDown, Pipette, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Tool,
  ActiveTool,
  FillStyle,
  TextAlign,
  TextVerticalAlign,
} from "@repo/element/types";
import { useCanvasUI } from "@repo/canvas-engine";

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
  tool: ActiveTool;
  selectedTool: Tool | null;
  onStrokeColor: (c: string) => void;
  onFillColor: (c: string) => void;
  onFillStyle: (s: FillStyle) => void;
  onStrokeWidth: (w: number) => void;
  onFontFamily: (v: string) => void;
  onFontSize: (v: number) => void;
  onFontWeight: (v: "normal" | "bold") => void;
  onTextAlign: (v: TextAlign) => void;
  onTextVerticalAlign: (v: TextVerticalAlign) => void;
  /** Drives which color palette is shown: dark canvas → light-first colors */
  canvasMode?: "light" | "dark";
}

export function StylePanel({
  tool,
  selectedTool,
  onStrokeColor,
  onFillColor,
  onFillStyle,
  onStrokeWidth,
  onFontFamily,
  onFontSize,
  onFontWeight,
  onTextAlign,
  onTextVerticalAlign,
  canvasMode = "light",
}: StylePanelProps) {
  const {
    strokeColor,
    fillColor,
    fillStyle,
    strokeWidth,
    fontFamily,
    fontSize,
    fontWeight,
    textAlign,
    textVerticalAlign,
  } = useCanvasUI();
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
    activeTool !== "arrow" &&
    activeTool !== "freehand" &&
    activeTool !== "highlighter" &&
    activeTool !== "text";
  const hasTextOptions =
    activeTool === "text" ||
    activeTool === "rectangle" ||
    activeTool === "ellipse" ||
    activeTool === "diamond";

  const showTextAlignGrid =
    activeTool === "rectangle" ||
    activeTool === "ellipse" ||
    activeTool === "diamond";

  return (
    <>
      <button
        type="button"
        title="Style controls"
        onClick={() => setIsOpen(true)}
        className="absolute bottom-[4.25rem] right-4 z-20 flex h-11 w-11 items-center justify-center rounded-2xl border border-border-default bg-surface-raised/88 text-text-secondary shadow-elev-2 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-surface-hover hover:text-text-primary active:translate-y-0 sm:bottom-auto sm:top-[5.5rem]"
      >
        <SlidersHorizontal size={19} strokeWidth={1.7} />
      </button>

      <div
        className={[
          "absolute bottom-[4.25rem] left-3 right-3 z-30 max-h-[52vh] flex-col gap-3.5 overflow-y-auto overflow-x-hidden rounded-2xl border border-border-default bg-surface-raised/92 p-3.5 shadow-elev-4 backdrop-blur-xl scrollbar-hide",
          isOpen ? "flex" : "hidden",
          "sm:bottom-auto sm:left-auto sm:right-4 sm:top-[8.75rem] sm:max-h-[calc(100vh-11rem)] sm:w-56",
        ].join(" ")}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Style
          </span>
          <button
            type="button"
            title="Close style controls"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover"
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
                className="h-8 w-full rounded-lg border border-[oklch(1_0_0/0.08)] bg-surface-raised px-2 text-[12px] font-medium text-text-body outline-none transition-colors hover:bg-surface-overlay focus:border-accent"
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
                  className="flex h-9 w-9 items-center justify-center rounded-md text-sm text-text-secondary transition-all hover:bg-surface-hover hover:text-text-body sm:h-6 sm:w-6"
                >
                  -
                </button>
                <span className="w-8 text-center text-[12px] font-medium tabular-nums text-text-secondary sm:w-6">
                  {fontSize}
                </span>
                <button
                  onClick={() => onFontSize(Math.min(200, fontSize + 2))}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-sm text-text-secondary transition-all hover:bg-surface-hover hover:text-text-body sm:h-6 sm:w-6"
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
                      ? "bg-accent text-accent-text"
                      : "text-text-secondary hover:bg-surface-hover",
                  ].join(" ")}
                >
                  B
                </button>
              </div>
            </Section>

            {showTextAlignGrid && (
              <>
                <div className="h-px bg-[oklch(1_0_0/0.07)]" />
                <Section label="Text position">
                  <AlignGrid
                    h={textAlign}
                    v={textVerticalAlign}
                    onChange={(h, v) => {
                      onTextAlign(h);
                      onTextVerticalAlign(v);
                    }}
                  />
                </Section>
              </>
            )}

            <div className="h-px bg-[oklch(1_0_0/0.07)]" />
          </>
        )}

        <Section label="Stroke" defaultOpen>
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
                        ? "bg-accent text-accent-text"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text-body",
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
                  return (
                    <button
                      key={w.value}
                      title={w.label}
                      onClick={() => onStrokeWidth(w.value)}
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-150 sm:h-7 sm:w-8",
                        active
                          ? "bg-accent"
                          : "bg-surface-raised hover:bg-surface-overlay",
                      ].join(" ")}
                    >
                      <div
                        style={{ height: w.thickness }}
                        className={
                          "w-4 rounded-full " +
                          (active ? "bg-accent-text" : "bg-text-secondary")
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

function AlignGrid({
  h,
  v,
  onChange,
}: {
  h: TextAlign;
  v: TextVerticalAlign;
  onChange: (h: TextAlign, v: TextVerticalAlign) => void;
}) {
  const rows: TextVerticalAlign[] = ["top", "middle", "bottom"];
  const cols: TextAlign[] = ["left", "center", "right"];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-raised p-1.5 w-fit">
      {rows.map((row) =>
        cols.map((col) => {
          const active = h === col && v === row;
          return (
            <button
              key={`${row}-${col}`}
              type="button"
              title={`${row} ${col}`}
              onClick={() => onChange(col, row)}
              className={[
                "h-5 w-5 rounded-sm border transition-colors",
                active
                  ? "border-accent bg-accent"
                  : "border-[oklch(1_0_0/0.12)] bg-transparent hover:bg-surface-hover",
              ].join(" ")}
            >
              <span
                className={[
                  "block h-1 w-1 rounded-full",
                  active ? "bg-accent-text" : "bg-text-dim",
                  row === "top" ? "mt-0.5" : row === "bottom" ? "mt-2" : "mt-1",
                  col === "left" ? "ml-0.5" : col === "right" ? "ml-2" : "ml-1",
                ].join(" ")}
              />
            </button>
          );
        }),
      )}
    </div>
  );
}

function Section({
  label,
  children,
  defaultOpen = false,
  collapsible = true,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || !collapsible);
  if (!collapsible) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-semibold tracking-widest uppercase text-text-dim">
          {label}
        </span>
        {children}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-1 text-left text-[9px] font-semibold tracking-widest uppercase text-text-dim transition-colors hover:text-text-secondary"
      >
        <span>{label}</span>
        <ChevronDown
          size={11}
          strokeWidth={2}
          className={[
            "transition-transform duration-150",
            open ? "rotate-0" : "-rotate-90",
          ].join(" ")}
        />
      </button>
      {open && children}
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
              ? "ring-2 ring-accent ring-offset-1 ring-offset-surface-raised scale-110"
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
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface-hover text-white">
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
