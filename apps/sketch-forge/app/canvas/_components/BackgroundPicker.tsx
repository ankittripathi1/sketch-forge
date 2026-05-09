"use client";

import {
  Grid2X2,
  Palette,
  Pipette,
  Rows3,
  SquareDashedMousePointer,
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
}

const OPTIONS = [
  {
    value: "plain",
    label: "Plain background",
    icon: <SquareDashedMousePointer size={15} strokeWidth={1.6} />,
  },
  {
    value: "dots",
    label: "Dot background",
    icon: <Rows3 size={15} strokeWidth={1.6} />,
  },
  {
    value: "grid",
    label: "Grid background",
    icon: <Grid2X2 size={15} strokeWidth={1.6} />,
  },
] satisfies { value: Background; label: string; icon: React.ReactNode }[];

const PAPER_SWATCHES = ["#f8f8f6", "#fff7e6", "#eef7f1", "#eef4ff", "#f7eef8"];
const PATTERN_SWATCHES = ["#d8dae2", "#b7c6d8", "#b9d4c2", "#dfc18e", "#d5b6dc"];

export function BackgroundPicker({
  background,
  backgroundColor,
  gridColor,
  dotColor,
  onChange,
  onBackgroundColor,
  onGridColor,
  onDotColor,
}: BackgroundPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activePatternColor = background === "dots" ? dotColor : gridColor;
  const updatePatternColor = background === "dots" ? onDotColor : onGridColor;

  return (
    <>
      <button
        type="button"
        title="Canvas appearance"
        onClick={() => setIsOpen(true)}
        className="absolute left-4 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-2xl bg-[oklch(0.18_0.012_260)] text-[oklch(0.72_0.01_260)] shadow-[0_6px_20px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.07)] sm:hidden"
      >
        <Palette size={19} strokeWidth={1.7} />
      </button>

      <div
        className={[
          "absolute left-3 right-3 top-16 z-30 flex flex-col gap-3 rounded-2xl bg-[oklch(0.18_0.012_260)] p-3 shadow-[0_8px_32px_oklch(0_0_0/0.42),inset_0_1px_0_oklch(1_0_0/0.07)]",
          isOpen ? "flex" : "hidden",
          "sm:bottom-4 sm:left-4 sm:right-auto sm:top-auto sm:flex sm:w-[236px]",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[oklch(0.48_0.008_260)]">
            Canvas
          </span>
          <div className="flex items-center gap-1 rounded-xl bg-[oklch(0.13_0.01_260)] p-1">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                title={opt.label}
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-150 sm:h-7 sm:w-7",
                  background === opt.value
                    ? "bg-[oklch(0.82_0.14_88)] text-[oklch(0.15_0.01_88)]"
                    : "text-[oklch(0.62_0.01_260)] hover:bg-[oklch(0.25_0.012_260)] hover:text-[oklch(0.88_0.005_260)]",
                ].join(" ")}
              >
                {opt.icon}
              </button>
            ))}
          </div>
          <button
            type="button"
            title="Close canvas controls"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[oklch(0.58_0.01_260)] hover:bg-[oklch(0.25_0.012_260)] sm:hidden"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <ColorRow
          label="Paper"
          value={backgroundColor}
          swatches={PAPER_SWATCHES}
          onChange={onBackgroundColor}
        />

        {background !== "plain" && (
          <ColorRow
            label={background === "dots" ? "Dots" : "Grid"}
            value={activePatternColor}
            swatches={PATTERN_SWATCHES}
            onChange={updatePatternColor}
          />
        )}
      </div>
    </>
  );
}

function ColorRow({
  label,
  value,
  swatches,
  onChange,
}: {
  label: string;
  value: string;
  swatches: string[];
  onChange: (color: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="w-12 text-[11px] font-medium text-[oklch(0.68_0.01_260)]">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        {swatches.map((color) => (
          <button
            key={color}
            title={color}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color }}
            className={[
              "h-7 w-7 rounded-full transition-all duration-100 hover:scale-110 sm:h-5 sm:w-5",
              value.toLowerCase() === color.toLowerCase()
                ? "ring-2 ring-[oklch(0.82_0.14_88)] ring-offset-1 ring-offset-[oklch(0.18_0.012_260)]"
                : "ring-1 ring-[oklch(0_0_0/0.12)]",
            ].join(" ")}
          />
        ))}
        <button
          type="button"
          title={`Custom ${label.toLowerCase()} color`}
          onClick={() => inputRef.current?.click()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[conic-gradient(from_90deg,#e05c7a,#e8a830,#5ab98a,#5a8ae8,#a06ae8,#e05c7a)] transition-all duration-100 hover:scale-110 sm:h-6 sm:w-6"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[oklch(0.18_0.012_260)] text-white">
            <Pipette size={10} strokeWidth={2} />
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
    </div>
  );
}
