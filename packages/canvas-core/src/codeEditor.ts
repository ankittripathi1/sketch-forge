import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export type CodeLanguage = "javascript" | "typescript" | "python" | "java";

export type CodeEditorResult = {
  text: string;
  width: number;
  height: number;
  language: CodeLanguage;
};

type CodeEditorOptions = {
  currentText?: string;
  x: number;
  y: number;
  width?: number;
  fontSize: number;
  color: string;
  zoom: number;
  language?: CodeLanguage;
  theme?: "light" | "dark";
};

function getLanguageExtension(language: CodeLanguage | undefined) {
  if (language === "python") return python();
  if (language === "java") return java();
  return javascript({ typescript: language === "typescript" });
}

export function openCodeEditor(
  opts: CodeEditorOptions,
): Promise<CodeEditorResult | null> {
  return new Promise((resolve) => {
    const isDark = opts.theme === "dark";
    const baseWidth = Math.max(opts.width ?? 420, 280);
    const minHeight = 96;
    const editorTextColor = isDark ? "#e8e6d8" : "#243044";
    const editorBorder = isDark
      ? "1px solid rgba(255,255,255,0.18)"
      : "1px solid rgba(15,23,42,0.14)";
    const editorBackground = isDark
      ? "rgba(12, 12, 18, 0.82)"
      : "rgba(255, 255, 255, 0.92)";

    const editorTheme = EditorView.theme({
      "&": {
        backgroundColor: editorBackground,
        color: editorTextColor,
        fontSize: `${opts.fontSize * opts.zoom}px`,
        height: "100%",
      },
      ".cm-scroller": {
        fontFamily: '"Geist Mono", monospace',
        backgroundColor: "transparent",
        lineHeight: "1.45",
      },
      ".cm-content": {
        caretColor: editorTextColor,
        padding: `${34 * opts.zoom}px ${14 * opts.zoom}px ${12 * opts.zoom}px`,
      },
      ".cm-selectionBackground": {
        backgroundColor: isDark
          ? "rgba(96, 165, 250, 0.35) !important"
          : "rgba(37, 99, 235, 0.18) !important",
      },
      "&.cm-focused": {
        outline: "none",
      },
    });

    const parent = document.createElement("div");
    const languageSelect = document.createElement("select");
    const editorHost = document.createElement("div");

    parent.addEventListener("keydown", (e) => {
      e.stopPropagation();
    });
    parent.addEventListener("keyup", (e) => {
      e.stopPropagation();
    });
    parent.addEventListener("keypress", (e) => {
      e.stopPropagation();
    });

    Object.assign(parent.style, {
      position: "fixed",
      left: `${opts.x}px`,
      top: `${opts.y}px`,
      width: `${baseWidth * opts.zoom}px`,
      minHeight: `${minHeight * opts.zoom}px`,
      zIndex: "9999",
      overflow: "hidden",
      borderRadius: "10px",
      border: editorBorder,
      background: editorBackground,
      boxShadow: isDark
        ? "0 18px 50px rgba(0,0,0,0.35)"
        : "0 18px 50px rgba(15,23,42,0.10)",
    });

    Object.assign(languageSelect.style, {
      position: "absolute",
      top: `${8 * opts.zoom}px`,
      right: `${10 * opts.zoom}px`,
      zIndex: "1",
      height: `${22 * opts.zoom}px`,
      border: editorBorder,
      borderRadius: "6px",
      background: isDark ? "rgba(24,24,31,0.94)" : "rgba(255,255,255,0.94)",
      color: editorTextColor,
      font: `${11 * opts.zoom}px "Geist Mono", monospace`,
      outline: "none",
    });

    Object.assign(editorHost.style, {
      minHeight: `${minHeight * opts.zoom}px`,
    });

    for (const language of [
      "javascript",
      "typescript",
      "python",
      "java",
    ] satisfies CodeLanguage[]) {
      const option = document.createElement("option");
      option.value = language;
      option.textContent =
        language === "javascript"
          ? "JavaScript"
          : language === "typescript"
            ? "TypeScript"
            : language === "python"
              ? "Python"
              : "Java";
      languageSelect.appendChild(option);
    }

    const highlightStyle = HighlightStyle.define([
      { tag: tags.keyword, color: isDark ? "#c678dd" : "#9333ea" },
      { tag: tags.string, color: isDark ? "#98c379" : "#15803d" },
      { tag: tags.number, color: isDark ? "#d19a66" : "#b45309" },
      {
        tag: tags.comment,
        color: isDark ? "#7f848e" : "#64748b",
        fontStyle: "italic",
      },
      {
        tag: tags.function(tags.variableName),
        color: isDark ? "#61afef" : "#2563eb",
      },
      { tag: tags.variableName, color: isDark ? "#e8e6d8" : "#334155" },
    ]);

    let submitted = false;
    let view: EditorView;
    let currentLanguage = opts.language ?? "javascript";
    languageSelect.value = currentLanguage;

    function submit() {
      if (submitted) return;
      submitted = true;

      const text = view.state.doc.toString();
      const height = Math.max(minHeight, view.dom.scrollHeight / opts.zoom);

      view.destroy();
      parent.remove();

      resolve({
        text,
        width: baseWidth,
        height,
        language: currentLanguage,
      });
    }

    function createState(doc: string) {
      return EditorState.create({
        doc,
        extensions: [
          keymap.of([
            {
              key: "Escape",
              run: () => {
                submit();
                return true;
              },
            },
            {
              key: "Mod-Enter",
              run: () => {
                submit();
                return true;
              },
            },
            indentWithTab,
            ...defaultKeymap,
          ]),
          getLanguageExtension(currentLanguage),
          EditorView.lineWrapping,
          syntaxHighlighting(highlightStyle),
          editorTheme,
        ],
      });
    }

    function mountView(doc: string) {
      view = new EditorView({
        state: createState(doc),
        parent: editorHost,
      });
    }

    document.body.appendChild(parent);
    parent.appendChild(languageSelect);
    parent.appendChild(editorHost);

    mountView(opts.currentText ?? "");

    languageSelect.addEventListener("change", () => {
      const doc = view.state.doc.toString();
      currentLanguage = languageSelect.value as CodeLanguage;
      view.destroy();
      mountView(doc);
      requestAnimationFrame(() => view.focus());
    });

    parent.addEventListener("focusout", (event) => {
      const nextTarget = event.relatedTarget as Node | null;
      if (!nextTarget || !parent.contains(nextTarget)) submit();
    });

    requestAnimationFrame(() => view.focus());
  });
}
