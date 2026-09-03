"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { useEffect, useRef } from "react";
import { Callout } from "./CalloutExtension";

interface NotesEditorProps {
  /** Markdown source of the note. */
  value: string;
  /** Called with the updated Markdown. Debouncing is the caller's job. */
  onChange: (markdown: string) => void;
  /**
   * Placeholder rendered inline on the first empty line (via the Placeholder
   * extension, so it sits exactly at the caret — no overlay to misalign).
   */
  placeholder?: string;
  /** Layout preset: the narrow side drawer, or the wide reading column. */
  variant?: "drawer" | "doc";
}

const DEFAULT_PLACEHOLDER =
  "Start writing — decisions, trade-offs, todos, why you chose an approach.";

export function NotesEditor({
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  variant = "drawer",
}: NotesEditorProps) {
  // Tracks the last Markdown this editor emitted so the parent echoing
  // `value` back down doesn't reset content (and the cursor) every keystroke.
  const lastEmitted = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Callout,
      Placeholder.configure({
        placeholder,
        // Only show it on a truly empty document, not on every empty block.
        showOnlyWhenEditable: true,
        includeChildren: false,
      }),
      Markdown,
    ],
    content: value,
    contentType: "markdown",
    editorProps: {
      attributes: {
        // Borderless document surface — no boxed input, no focus ring.
        class: `notes-editor-content notes-editor-${variant} focus:outline-none`,
        "aria-label": "Page notes",
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = editor.getMarkdown();
      lastEmitted.current = markdown;
      onChange(markdown);
    },
    // Avoids SSR hydration mismatches in Next.js.
    immediatelyRender: false,
  });

  // External value change (page switch, migration) — replace the content.
  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      lastEmitted.current = value;
      editor.commands.setContent(value, { contentType: "markdown" });
    }
  }, [value, editor]);

  return <EditorContent editor={editor} className="h-full overflow-y-auto" />;
}
