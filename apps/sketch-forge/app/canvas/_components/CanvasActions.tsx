"use client";

import { Loader2, Settings2, Sparkles } from "lucide-react";
import { SketchElement } from "@repo/canvas-core/types";
import { TemplateMenu } from "./TemplateMenu";

interface CanvasActionsProps {
  elements: SketchElement[];
  onBeautify: () => void;
  isBeautifying: boolean;
  hasElements: boolean;
  hasApiKey: boolean;
  onSettingsClick: () => void;
}

export function CanvasActions({
  elements,
  onBeautify,
  isBeautifying,
  hasElements,
  hasApiKey,
  onSettingsClick,
}: CanvasActionsProps) {
  const beautifyDisabled = isBeautifying || !hasElements;
  const beautifyTitle = !hasElements
    ? "Draw something first"
    : !hasApiKey
      ? "Add a Gemini API key in Settings"
      : isBeautifying
        ? "Beautifying..."
        : "Beautify with AI";

  function handleBeautifyClick() {
    if (beautifyDisabled) return;
    if (!hasApiKey) {
      onSettingsClick();
      return;
    }
    onBeautify();
  }

  return (
    <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-2xl bg-surface-raised p-1.5 shadow-[0_8px_32px_oklch(0_0_0/0.45),inset_0_1px_0_oklch(1_0_0/0.07)] sm:right-4">
      <button
        onClick={handleBeautifyClick}
        disabled={beautifyDisabled}
        title={beautifyTitle}
        className={[
          "flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold outline-none transition-all duration-150 sm:h-9 sm:px-2.5",
          beautifyDisabled
            ? "cursor-not-allowed text-text-dim opacity-50"
            : hasApiKey
              ? "cursor-pointer bg-accent-subtle text-accent hover:bg-accent-glow"
              : "cursor-pointer text-text-secondary hover:bg-surface-hover hover:text-text-body",
        ].join(" ")}
      >
        {isBeautifying ? (
          <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
        ) : (
          <Sparkles size={15} strokeWidth={1.75} />
        )}
        <span className="hidden sm:inline">
          {hasApiKey
            ? isBeautifying
              ? "Thinking..."
              : "Beautify"
            : "Set up AI"}
        </span>
      </button>

      <Divider />

      <TemplateMenu elements={elements} />

      <Divider />

      <button
        onClick={onSettingsClick}
        title="Settings"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-secondary outline-none transition-all duration-150 hover:bg-surface-hover hover:text-text-body sm:h-9 sm:w-9"
      >
        <Settings2 size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px bg-border-subtle" />;
}
