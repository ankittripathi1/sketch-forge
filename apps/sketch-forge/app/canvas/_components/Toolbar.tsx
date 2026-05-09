"use client";

import {
  Square,
  Circle,
  Minus,
  Pencil,
  Eraser,
  Undo2,
  Redo2,
} from "lucide-react";
import type { ReactNode } from "react";
import { Tool } from "@repo/canvas-core/types";

const TOOLS: { icon: ReactNode; value: Tool; label: string }[] = [
  {
    icon: <Square size={15} strokeWidth={1.5} />,
    value: "rectangle",
    label: "Rectangle (R)",
  },
  {
    icon: <Circle size={15} strokeWidth={1.5} />,
    value: "ellipse",
    label: "Ellipse (E)",
  },
  {
    icon: <Minus size={15} strokeWidth={1.5} />,
    value: "line",
    label: "Line (L)",
  },
  {
    icon: <Pencil size={15} strokeWidth={1.5} />,
    value: "freehand",
    label: "Freehand (F)",
  },
  {
    icon: <Eraser size={15} strokeWidth={1.5} />,
    value: "eraser",
    label: "Eraser (X)",
  },
];

interface ToolbarProps {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function Toolbar({
  tool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 rounded-2xl p-1.5 bg-[oklch(0.18_0.012_260)] shadow-[0_8px_32px_oklch(0_0_0/0.4),inset_0_1px_0_oklch(1_0_0/0.07)]">
      <ToolBtn onClick={onUndo} disabled={!canUndo} label="Undo (⌘Z)">
        <Undo2 size={15} strokeWidth={1.75} />
      </ToolBtn>
      <ToolBtn onClick={onRedo} disabled={!canRedo} label="Redo (⌘⇧Z)">
        <Redo2 size={15} strokeWidth={1.75} />
      </ToolBtn>

      <div className="w-px h-5 mx-1 bg-[oklch(1_0_0/0.1)]" />

      {TOOLS.map((t) => (
        <ToolBtn
          key={t.value}
          onClick={() => onToolChange(t.value)}
          active={tool === t.value}
          label={t.label}
        >
          {t.icon}
        </ToolBtn>
      ))}
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  disabled = false,
  active = false,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={[
        "flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 outline-none",
        active
          ? "bg-[oklch(0.82_0.14_88)] text-[oklch(0.15_0.01_88)] shadow-[0_1px_4px_oklch(0.82_0.14_88/0.4)]"
          : disabled
            ? "text-[oklch(0.35_0.005_260)] cursor-not-allowed"
            : "text-[oklch(0.65_0.01_260)] hover:bg-[oklch(0.26_0.01_260)] hover:text-[oklch(0.88_0.005_260)] cursor-pointer",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
