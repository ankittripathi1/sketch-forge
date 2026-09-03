"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { NotesEditor } from "./NotesEditor";

export const NOTES_DRAWER_MIN_WIDTH = 300;
export const NOTES_DRAWER_MAX_WIDTH = 640;
const WIDTH_STORAGE_KEY = "sketch-forge:notes-width";

function clampWidth(width: number) {
  return Math.min(
    NOTES_DRAWER_MAX_WIDTH,
    Math.max(NOTES_DRAWER_MIN_WIDTH, width),
  );
}

export function useNotesDrawerWidth() {
  const [width, setWidth] = useState(380);

  useEffect(() => {
    const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0) setWidth(clampWidth(stored));
  }, []);

  const persistWidth = useCallback((next: number) => {
    const clamped = clampWidth(next);
    setWidth(clamped);
    localStorage.setItem(WIDTH_STORAGE_KEY, String(clamped));
    return clamped;
  }, []);

  return { width, persistWidth };
}

interface NotesDrawerProps {
  isOpen: boolean;
  width: number;
  onWidthChange: (width: number) => void;
  onClose: () => void;
  /** Markdown source of the note. */
  note: string;
  onNoteChange: (markdown: string) => void;
  isSaving: boolean;
  hasSaved: boolean;
}

/**
 * Right-docked, full-height notes drawer (PRD §6). Resizable via a drag
 * handle on its inner edge; the parent shifts the right-side floating canvas
 * controls out from under it via the `--notes-w` CSS variable.
 */
export function NotesDrawer({
  isOpen,
  width,
  onWidthChange,
  onClose,
  note,
  onNoteChange,
  isSaving,
  hasSaved,
}: NotesDrawerProps) {
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startWidth: width };
    const handleMove = (move: PointerEvent) => {
      if (!dragState.current) return;
      // Drawer is right-docked, so dragging left grows it.
      onWidthChange(
        dragState.current.startWidth + (dragState.current.startX - move.clientX),
      );
    };
    const handleUp = () => {
      dragState.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  if (!isOpen) return null;

  const wordCount = note.trim().split(/\s+/).filter(Boolean).length;

  return (
    <aside
      className="absolute right-0 top-0 z-30 flex h-full max-w-[88vw] flex-col border-l border-border-default bg-surface-base text-text-body shadow-2xl"
      style={{ width }}
      aria-label="Page notes"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={handleResizeStart}
        className="absolute -left-1 top-0 z-10 h-full w-2 cursor-col-resize touch-none hover:bg-accent/20 active:bg-accent/30"
      />

      <header className="flex items-center gap-2 border-b border-border-subtle px-5 py-3">
        <h2 className="text-[13px] font-semibold text-text-heading">Notes</h2>
        <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          This page
        </span>
        <span className="ml-auto text-[10px] tabular-nums text-text-dim">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-body"
          title="Close notes"
          aria-label="Close notes"
        >
          <X size={14} />
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <NotesEditor
          value={note}
          onChange={onNoteChange}
          placeholder="Start writing — decisions, trade-offs, todos, why you chose an approach."
        />
      </div>

      <footer className="flex items-center gap-1.5 border-t border-border-subtle px-5 py-2 text-[10px] font-medium text-text-dim">
        {isSaving ? (
          <>
            <Loader2 size={11} className="animate-spin" />
            Saving
          </>
        ) : (
          <>
            <CheckCircle2 size={11} />
            {hasSaved ? "Saved" : "Autosave on"}
          </>
        )}
      </footer>
    </aside>
  );
}
