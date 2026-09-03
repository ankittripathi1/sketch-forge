"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Terminal } from "lucide-react";
import { MarkdownSourceEditor } from "./MarkdownSourceEditor";

const VIM_STORAGE_KEY = "sketch-forge:vim-mode";

/** Persisted, app-wide vim-mode preference for the source editor. */
export function useVimMode() {
  const [vimEnabled, setVimEnabled] = useState(false);

  useEffect(() => {
    setVimEnabled(localStorage.getItem(VIM_STORAGE_KEY) === "true");
  }, []);

  const toggle = useCallback(() => {
    setVimEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(VIM_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { vimEnabled, toggle };
}

interface DocViewProps {
  title: string;
  onTitleChange: (title: string) => void;
  onTitleCommit: () => void;
  note: string;
  onNoteChange: (markdown: string) => void;
  isSaving: boolean;
  hasSaved: boolean;
}

/**
 * Doc view mode: a full-width, centred reading-column document. The body is a
 * CodeMirror 6 Markdown *source* editor (Obsidian-style) so it supports real
 * vim mode and plain-text editing. The title input and editor share the
 * column's left edge.
 */
export function DocView({
  title,
  onTitleChange,
  onTitleCommit,
  note,
  onNoteChange,
  isSaving,
  hasSaved,
}: DocViewProps) {
  const { vimEnabled, toggle: toggleVim } = useVimMode();

  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-surface-base">
      <div className="doc-column mx-auto w-full max-w-[44rem] px-8 pb-32 pt-20 sm:pt-24">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleCommit}
          placeholder="Untitled"
          aria-label="Document title"
          className="doc-title w-full bg-transparent outline-none placeholder:text-text-dim"
        />
        <div className="mb-3 mt-1.5 flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-text-dim">
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
          </span>
          <button
            onClick={toggleVim}
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors ${
              vimEnabled
                ? "bg-accent-subtle text-accent"
                : "text-text-dim hover:bg-surface-hover hover:text-text-secondary"
            }`}
            title={vimEnabled ? "Disable vim mode" : "Enable vim mode"}
            aria-pressed={vimEnabled}
          >
            <Terminal size={11} />
            Vim
          </button>
        </div>
        <MarkdownSourceEditor
          value={note}
          onChange={onNoteChange}
          vimEnabled={vimEnabled}
          autoFocus
          placeholder="Start writing — decisions, trade-offs, todos, why you chose an approach."
        />
      </div>
    </div>
  );
}
