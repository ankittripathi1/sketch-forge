"use client";

import { Pencil, Type, Undo2, CheckCircle2 } from "lucide-react";
import { Tool } from "@repo/canvas-core/types";

interface CaptureToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  onUndo: () => void;
  canUndo: boolean;
  onDone: () => void;
}

const COLORS = ["#000000", "#3b82f6", "#ef4444", "#22c55e", "#a855f7"];
const WIDTHS = [2, 5, 12];

export function CaptureToolbar({
  tool,
  setTool,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  onUndo,
  canUndo,
  onDone,
}: CaptureToolbarProps) {
  const handleColorCycle = () => {
    if (tool !== "freehand") {
      setTool("freehand");
      return;
    }
    const currentIndex = COLORS.indexOf(strokeColor);
    const nextIndex = (currentIndex + 1) % COLORS.length;
    setStrokeColor(COLORS[nextIndex]!);
  };

  const handleWidthCycle = () => {
    const currentIndex = WIDTHS.indexOf(strokeWidth);
    const nextIndex = (currentIndex + 1) % WIDTHS.length;
    setStrokeWidth(WIDTHS[nextIndex]!);
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-3xl bg-surface-hover shadow-[0_8px_32px_oklch(0_0_0/0.5),inset_0_1px_0_oklch(1_0_0/0.1)] border border-[oklch(1_0_0/0.05)] backdrop-blur-md">
      {/* Draw Tool */}
      <button
        onClick={handleColorCycle}
        className={`relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all active:scale-90 ${
          tool === "freehand"
            ? "bg-accent text-accent-text"
            : "text-text-secondary"
        }`}
      >
        <Pencil size={24} strokeWidth={2.5} />
        <div
          className="absolute bottom-2 right-2 h-3 w-3 rounded-full border border-white/20"
          style={{ backgroundColor: strokeColor }}
        />
      </button>

      {/* Width Toggle */}
      <button
        onClick={handleWidthCycle}
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-text-secondary active:scale-90"
      >
        <div className="flex items-center justify-center h-6 w-6 rounded-full border-2 border-text-muted">
          <div
            className="rounded-full bg-text-body transition-all"
            style={{ width: strokeWidth + 2, height: strokeWidth + 2 }}
          />
        </div>
      </button>

      {/* Text Tool */}
      <button
        onClick={() => setTool("text")}
        className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all active:scale-90 ${
          tool === "text"
            ? "bg-accent text-accent-text"
            : "text-text-secondary"
        }`}
      >
        <Type size={24} strokeWidth={2.5} />
      </button>

      <div className="w-px h-8 bg-[oklch(1_0_0/0.1)] mx-1" />

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-text-secondary disabled:opacity-30 active:scale-90 transition-all"
      >
        <Undo2 size={24} strokeWidth={2.5} />
      </button>

      {/* Done */}
      <button
        onClick={onDone}
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.35_0.15_150)] text-white shadow-[0_4px_12px_oklch(0.35_0.15_150/0.4)] active:scale-95 transition-all ml-1"
      >
        <CheckCircle2 size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
}
