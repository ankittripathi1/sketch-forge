"use client";

import {
  ArrowRight,
  Circle,
  Diamond,
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
import type { ActiveTool } from "@repo/element/types";
import { useShortcutPlatform } from "../hooks/useShortcutPlatform";
import {
  getToolShortcutId,
  type CanvasShortcutRegistry,
} from "../runtime/shortcutRegistry";

const TOOL_GROUPS: {
  items: { icon: ReactNode; value: ActiveTool }[];
}[] = [
  {
    items: [
      {
        icon: <MousePointer2 size={16} strokeWidth={1.6} />,
        value: "select",
      },
    ],
  },
  {
    items: [
      {
        icon: <Square size={16} strokeWidth={1.6} />,
        value: "rectangle",
      },
      {
        icon: <Circle size={16} strokeWidth={1.6} />,
        value: "ellipse",
      },
      {
        icon: <Diamond size={16} strokeWidth={1.6} />,
        value: "diamond",
      },
      {
        icon: <Minus size={16} strokeWidth={1.6} />,
        value: "line",
      },
      {
        icon: <ArrowRight size={16} strokeWidth={1.6} />,
        value: "arrow",
      },
      {
        icon: <Pencil size={16} strokeWidth={1.6} />,
        value: "freehand",
      },
      {
        icon: <Highlighter size={16} strokeWidth={1.6} />,
        value: "highlighter",
      },
    ],
  },
  {
    items: [
      {
        icon: <Type size={16} strokeWidth={1.6} />,
        value: "text",
      },
      {
        icon: <Eraser size={16} strokeWidth={1.6} />,
        value: "eraser",
      },
    ],
  },
];

interface ToolbarProps {
  tool: ActiveTool;
  onToolChange: (t: ActiveTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  shortcuts: CanvasShortcutRegistry;
}

export function Toolbar({
  tool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  shortcuts,
}: ToolbarProps) {
  const { isMac } = useShortcutPlatform();

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 flex max-w-[calc(100vw-16px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-2xl border border-border-default bg-surface-raised/88 p-1.5 shadow-elev-3 backdrop-blur-xl sm:max-w-[min(52rem,calc(100vw-16rem))]">
      {TOOL_GROUPS.map((group, groupIdx) => (
        <div key={groupIdx} className="flex items-center gap-1">
          {group.items.map((t) => (
            <ToolBtn
              key={t.value}
              onClick={() => onToolChange(t.value)}
              active={tool === t.value}
              label={shortcuts.getTooltip(getToolShortcutId(t.value), isMac)}
            >
              {t.icon}
            </ToolBtn>
          ))}
          {groupIdx < TOOL_GROUPS.length - 1 && <Divider />}
        </div>
      ))}

      <Divider />

      <ToolBtn
        onClick={onUndo}
        disabled={!canUndo}
        label={shortcuts.getTooltip("history.undo", isMac)}
      >
        <Undo2 size={15} strokeWidth={1.75} />
      </ToolBtn>
      <ToolBtn
        onClick={onRedo}
        disabled={!canRedo}
        label={shortcuts.getTooltip("history.redo", isMac)}
      >
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
      aria-label={label}
      className={[
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl outline-none transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] sm:h-9 sm:w-9",
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
