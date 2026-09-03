"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  drawSelection,
  highlightActiveLine,
  placeholder as cmPlaceholder,
} from "@codemirror/view";
import {
  history,
  historyKeymap,
  defaultKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import {
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { vim } from "@replit/codemirror-vim";

interface MarkdownSourceEditorProps {
  /** Markdown source. */
  value: string;
  /** Called with the updated Markdown on user edits (debouncing is the caller's job). */
  onChange: (markdown: string) => void;
  placeholder?: string;
  /** Enable vim keybindings (Obsidian-style modal editing). */
  vimEnabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Obsidian-style Markdown *source* editor built on CodeMirror 6. Unlike the
 * TipTap WYSIWYG editor, this edits the raw Markdown text directly — which is
 * what makes real vim mode (`@replit/codemirror-vim`) possible and gives the
 * plain-text writing feel. The stored `note` is the exact buffer text, so it
 * round-trips losslessly with no serialization step.
 */

// Editor chrome/typography, themed from the app's CSS variables so it matches
// both light and dark automatically.
const appTheme = EditorView.theme({
  "&": {
    color: "var(--color-text-body)",
    backgroundColor: "transparent",
    fontSize: "17px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-body, ui-sans-serif, system-ui, sans-serif)",
    lineHeight: "1.78",
  },
  ".cm-content": {
    padding: "0",
    caretColor: "var(--color-accent)",
    maxWidth: "100%",
  },
  ".cm-line": { padding: "0 0" },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--color-accent)",
    borderLeftWidth: "2px",
  },
  ".cm-fat-cursor": {
    background: "var(--color-accent)",
    color: "var(--color-surface-base) !important",
  },
  "&:not(.cm-focused) .cm-fat-cursor": {
    background: "transparent",
    outline: "1px solid var(--color-accent)",
    color: "transparent !important",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(224, 49, 94, 0.18)",
  },
  ".cm-content ::selection": { backgroundColor: "rgba(224, 49, 94, 0.18)" },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-placeholder": {
    color: "var(--color-text-dim)",
    fontStyle: "normal",
  },
  // Vim status line pinned under the document.
  ".cm-vim-panel": {
    padding: "6px 2px 0",
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
    fontSize: "12px",
    color: "var(--color-text-muted)",
    backgroundColor: "transparent",
  },
  ".cm-vim-panel input": { color: "var(--color-text-body)" },
});

// Markdown token styling — headings larger/bold, emphasis, code, links, etc.
const markdownHighlight = HighlightStyle.define([
  {
    tag: t.heading1,
    fontSize: "1.7em",
    fontWeight: "700",
    color: "var(--color-text-heading)",
    lineHeight: "1.3",
  },
  {
    tag: t.heading2,
    fontSize: "1.4em",
    fontWeight: "700",
    color: "var(--color-text-heading)",
    lineHeight: "1.3",
  },
  {
    tag: t.heading3,
    fontSize: "1.18em",
    fontWeight: "700",
    color: "var(--color-text-heading)",
  },
  {
    tag: [t.heading4, t.heading5, t.heading6],
    fontWeight: "700",
    color: "var(--color-text-heading)",
  },
  { tag: t.strong, fontWeight: "700", color: "var(--color-text-heading)" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  {
    tag: [t.monospace],
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
    fontSize: "0.9em",
    color: "var(--color-text-heading)",
  },
  { tag: t.link, color: "var(--color-accent)" },
  { tag: t.url, color: "var(--color-text-muted)" },
  { tag: t.quote, color: "var(--color-text-secondary)" },
  // Colour only the markers (`#`, `-`, `>`, `` ` ``) — not the list content.
  { tag: t.processingInstruction, color: "var(--color-accent)" },
  { tag: t.contentSeparator, color: "var(--color-text-dim)" },
  { tag: t.meta, color: "var(--color-text-muted)" },
]);

export function MarkdownSourceEditor({
  value,
  onChange,
  placeholder = "",
  vimEnabled = false,
  autoFocus = false,
}: MarkdownSourceEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Tracks the text this editor last emitted, so echoing `value` back down
  // doesn't reset the buffer/cursor on every keystroke.
  const lastEmitted = useRef(value);
  // Latest value, read when the editor is (re)created so a vim toggle rebuild
  // keeps the current content rather than the value at first mount.
  const valueRef = useRef(value);
  valueRef.current = value;

  // (Re)create the editor. `@replit/codemirror-vim` only initialises correctly
  // when `vim()` is present at construction, so toggling vim recreates the
  // view rather than reconfiguring a compartment.
  useEffect(() => {
    if (!hostRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      const text = update.state.doc.toString();
      lastEmitted.current = text;
      onChangeRef.current(text);
    });

    const initialDoc = valueRef.current;
    lastEmitted.current = initialDoc;

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        // Vim must precede other keymaps.
        ...(vimEnabled ? [vim()] : []),
        history(),
        drawSelection(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        bracketMatching(),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        syntaxHighlighting(markdownHighlight),
        cmPlaceholder(placeholder),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        appTheme,
        updateListener,
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    if (autoFocus) view.focus();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Recreate only when vim is toggled; live value/placeholder changes are
    // handled by the sync effect below (and refs), not by rebuilding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vimEnabled]);

  // External value change (page switch, migration) — replace the doc.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (value === lastEmitted.current) return;
    if (value === view.state.doc.toString()) return;
    lastEmitted.current = value;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

  return <div ref={hostRef} className="markdown-source-editor" />;
}
