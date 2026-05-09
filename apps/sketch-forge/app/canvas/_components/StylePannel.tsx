"use client";

import type { ReactNode } from "react";
import { Tool, FillStyle } from "@repo/canvas-core/types";

const COLORS = [
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

const FILL_STYLES: { value: FillStyle; label: string; icon: ReactNode }[] = [
  {
    value: "none",
    label: "No fill",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14">
        <rect
          x="1"
          y="1"
          width="12"
          height="12"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <line
          x1="1"
          y1="13"
          x2="13"
          y2="1"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    ),
  },
  {
    value: "hachure",
    label: "Hachure fill",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14">
        <rect
          x="1"
          y="1"
          width="12"
          height="12"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
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
    label: "Solid fill",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14">
        <rect
          x="1"
          y="1"
          width="12"
          height="12"
          rx="1"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    ),
  },
];

const WIDTHS: { value: number; label: string; height: string }[] = [
  { value: 1, label: "Thin", height: "h-px" },
  { value: 2, label: "Medium", height: "h-0.5" },
  { value: 4, label: "Bold", height: "h-1" },
];

interface StylePanelProps {
  tool: Tool;
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  onStrokeColor: (c: string) => void;
  onFillColor: (c: string) => void;
  onFillStyle: (s: FillStyle) => void;
  onStrokeWidth: (w: number) => void;
}

export function StylePanel({
  tool,
  strokeColor,
  fillColor,
  fillStyle,
  strokeWidth,
  onStrokeColor,
  onFillColor,
  onFillStyle,
  onStrokeWidth,
}: StylePanelProps) {
  if (tool === "eraser") return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-2xl px-2.5 py-1.5 bg-[oklch(0.18_0.012_260)] shadow-[0_4px_16px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.07)]">
      {/* Stroke */}
      <Section label="Stroke">
        <ColorRow
          colors={COLORS}
          selected={strokeColor}
          onSelect={onStrokeColor}
        />
      </Section>

      <Divider />

      {/* Fill style + color */}
      <Section label="Fill">
        <div className="flex items-center gap-1">
          {FILL_STYLES.map((fs) => (
            <button
              key={fs.value}
              title={fs.label}
              onClick={() => onFillStyle(fs.value)}
              className={[
                "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150",
                fillStyle === fs.value
                  ? "bg-[oklch(0.82_0.14_88)] text-[oklch(0.15_0.01_88)]"
                  : "text-[oklch(0.55_0.01_260)] hover:bg-[oklch(0.26_0.01_260)] hover:text-[oklch(0.8_0.005_260)]",
              ].join(" ")}
            >
              {fs.icon}
            </button>
          ))}
          {fillStyle !== "none" && (
            <>
              <div className="w-px h-4 bg-[oklch(1_0_0/0.08)]" />
              <ColorRow
                colors={COLORS}
                selected={fillColor}
                onSelect={onFillColor}
              />
            </>
          )}
        </div>
      </Section>

      <Divider />

      {/* Width */}
      <Section label="Width">
        <div className="flex items-center gap-1">
          {WIDTHS.map((w) => (
            <button
              key={w.value}
              title={w.label}
              onClick={() => onStrokeWidth(w.value)}
              className={[
                "flex items-center justify-center w-8 h-7 rounded-lg transition-all duration-150",
                strokeWidth === w.value
                  ? "bg-[oklch(0.82_0.14_88)]"
                  : "hover:bg-[oklch(0.26_0.01_260)]",
              ].join(" ")}
            >
              <div
                className={`w-4 ${w.height} rounded-full ${strokeWidth === w.value ? "bg-[oklch(0.15_0.01_88)]" : "bg-[oklch(0.65_0.01_260)]"}`}
              />
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-semibold tracking-widest uppercase text-[oklch(0.38_0.008_260)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-[oklch(1_0_0/0.08)]" />;
}

function ColorRow({
  colors,
  selected,
  onSelect,
}: {
  colors: typeof COLORS;
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {colors.map((c) => (
        <button
          key={c.value}
          title={c.label}
          onClick={() => onSelect(c.value)}
          style={{ background: c.value }}
          className={[
            "w-5 h-5 rounded-full transition-all duration-100",
            selected === c.value
              ? "ring-2 ring-[oklch(0.82_0.14_88)] ring-offset-1 ring-offset-[oklch(0.18_0.012_260)] scale-110"
              : "hover:scale-110",
          ].join(" ")}
        />
      ))}
    </div>
  );
}
