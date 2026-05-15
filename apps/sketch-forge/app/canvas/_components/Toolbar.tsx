"use client";

import {
  Circle,
  Eraser,
  Highlighter,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import type { ReactNode } from "react";
import { Tool } from "@repo/canvas-core/types";

const TOOL_GROUPS: {
  items: { icon: ReactNode; value: Tool; label: string }[];
}[] = [
  {
    items: [
      {
        icon: <MousePointer2 size={16} strokeWidth={1.6} />,
        value: "select",
        label: "Select · S",
      },
    ],
  },
  {
    items: [
      {
        icon: <Square size={16} strokeWidth={1.6} />,
        value: "rectangle",
        label: "Rectangle · R",
      },
      {
        icon: <Circle size={16} strokeWidth={1.6} />,
        value: "ellipse",
        label: "Ellipse · E",
      },
      {
        icon: <Minus size={16} strokeWidth={1.6} />,
        value: "line",
        label: "Line · L",
      },
      {
        icon: <Pencil size={16} strokeWidth={1.6} />,
        value: "freehand",
        label: "Freehand · F",
      },
      {
        icon: <Highlighter size={16} strokeWidth={1.6} />,
        value: "highlighter",
        label: "Highlighter · H",
      },
    ],
  },
  {
    items: [
      {
        icon: <Type size={16} strokeWidth={1.6} />,
        value: "text",
        label: "Text · T",
      },
      {
        icon: <Eraser size={16} strokeWidth={1.6} />,
        value: "eraser",
        label: "Eraser · X",
      },
    ],
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
    <div className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100vw-16px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-2xl bg-surface-raised p-1.5 shadow-[0_8px_32px_oklch(0_0_0/0.50),inset_0_1px_0_oklch(1_0_0/0.07)] sm:bottom-auto sm:top-3 sm:max-w-[calc(100vw-24px)]">
      {TOOL_GROUPS.map((group, groupIdx) => (
        <div key={groupIdx} className="flex items-center gap-1">
          {group.items.map((t) => (
            <ToolBtn
              key={t.value}
              onClick={() => onToolChange(t.value)}
              active={tool === t.value}
              label={t.label}
            >
              {t.icon}
            </ToolBtn>
          ))}
          {groupIdx < TOOL_GROUPS.length - 1 && <Divider />}
        </div>
      ))}

      <Divider />

      <ToolBtn onClick={onUndo} disabled={!canUndo} label="Undo · ⌘Z">
        <Undo2 size={15} strokeWidth={1.75} />
      </ToolBtn>
      <ToolBtn onClick={onRedo} disabled={!canRedo} label="Redo · ⌘⇧Z">
        <Redo2 size={15} strokeWidth={1.75} />
      </ToolBtn>
    </div>
  );
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px bg-border-subtle" />;
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
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl outline-none transition-all duration-150 sm:h-9 sm:w-9",
        active
          ? "bg-accent-subtle text-accent ring-1 ring-accent/30"
          : disabled
            ? "cursor-not-allowed text-text-dim opacity-50"
            : "cursor-pointer text-text-secondary hover:bg-surface-hover hover:text-text-body",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
