"use client";

import type { ComponentProps } from "react";
import { Palette, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { BackgroundPicker } from "./BackgroundPicker";
import { SettingsPanel } from "./SettingsPanel";
import { StylePanel } from "./StylePanel";

export type CanvasInspectorPanel = "style" | "canvas" | "ai";

interface CanvasInspectorProps {
  activePanel: CanvasInspectorPanel | null;
  onPanelChange: (panel: CanvasInspectorPanel | null) => void;
  style: Omit<ComponentProps<typeof StylePanel>, "embedded">;
  canvas: Omit<ComponentProps<typeof BackgroundPicker>, "embedded">;
  ai: Omit<ComponentProps<typeof SettingsPanel>, "embedded">;
}

const tabs = [
  { id: "style", label: "Style", icon: SlidersHorizontal },
  { id: "canvas", label: "Canvas", icon: Palette },
  { id: "ai", label: "AI", icon: Sparkles },
] as const;

export function CanvasInspector({
  activePanel,
  onPanelChange,
  style,
  canvas,
  ai,
}: CanvasInspectorProps) {
  return (
    <>
      <div className="pointer-events-auto absolute right-3 top-[4.5rem] z-20 flex flex-col gap-1 rounded-2xl border border-border-default bg-surface-raised/90 p-1.5 shadow-elev-3 backdrop-blur-xl sm:right-4 sm:top-[5rem]">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activePanel === id;
          return (
            <button
              key={id}
              type="button"
              aria-label={`Open ${label.toLowerCase()} inspector`}
              aria-pressed={isActive}
              title={label}
              onClick={() => onPanelChange(isActive ? null : id)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-[transform,background-color,color] duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
                isActive
                  ? "bg-accent text-accent-text"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              <Icon size={16} strokeWidth={1.7} />
            </button>
          );
        })}
      </div>

      <aside
        aria-label="Canvas inspector"
        aria-hidden={!activePanel}
        className={`pointer-events-auto absolute bottom-[4.75rem] left-3 right-3 z-30 flex max-h-[64dvh] flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-raised/94 shadow-elev-4 backdrop-blur-2xl transition-[opacity,transform] duration-300 ease-out sm:bottom-auto sm:left-auto sm:right-[4.75rem] sm:top-[5rem] sm:max-h-[calc(100dvh-6rem)] sm:w-[18rem] ${
          activePanel
            ? "translate-y-0 opacity-100 sm:translate-x-0"
            : "pointer-events-none translate-y-3 opacity-0 sm:translate-x-3 sm:translate-y-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Inspector
            </p>
            <p className="mt-0.5 text-[13px] font-semibold text-text-body">
              {tabs.find((tab) => tab.id === activePanel)?.label ?? "Canvas"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close inspector"
            onClick={() => onPanelChange(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <X size={15} />
          </button>
        </div>

        {activePanel === "style" && <StylePanel {...style} embedded />}
        {activePanel === "canvas" && <BackgroundPicker {...canvas} embedded />}
        {activePanel === "ai" && <SettingsPanel {...ai} embedded />}
      </aside>
    </>
  );
}
