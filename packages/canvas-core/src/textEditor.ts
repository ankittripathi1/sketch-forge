import { measureTextBox, LINE_HEIGHT } from "@repo/element/text";

// Pure text measurement now lives in @repo/element. Re-exported so existing
// importers of "@repo/canvas-core/textEditor" keep working.
export { measureTextBox } from "@repo/element/text";

export type TextEditorResult = {
  text: string;
  width: number;
  height: number;
};

type TextEditorOptions = {
  currentText?: string;
  x: number;
  y: number;
  width?: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  color: string;
  zoom: number;
  fixedWidth?: boolean;
  align?: "left" | "center";
};

export function openTextEditor(
  opts: TextEditorOptions,
): Promise<TextEditorResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement("textarea");
    const baseWidth = Math.max(opts.width ?? 20, 20);
    const scaledFontSize = opts.fontSize * opts.zoom;
    const minHeight = opts.fontSize * LINE_HEIGHT;
    const font = `${opts.fontWeight} ${scaledFontSize}px ${opts.fontFamily}`;
    // Mirror the rich-text renderer's padding so the typed text sits where
    // it will appear after commit.
    const editorPad = Math.max(2, opts.fontSize * 0.08) * opts.zoom;

    input.value = opts.currentText ?? "";
    input.dir = "auto";
    input.wrap = opts.fixedWidth ? "soft" : "off";

    Object.assign(input.style, {
      position: "fixed",
      left: `${opts.x}px`,
      top: `${opts.y}px`,
      width: `${baseWidth * opts.zoom}px`,
      minWidth: `${Math.min(baseWidth * opts.zoom, 240)}px`,
      minHeight: `${minHeight * opts.zoom}px`,
      font,
      lineHeight: `${LINE_HEIGHT}`,
      color: opts.color,
      textAlign: opts.align ?? "left",
      padding: `${editorPad}px`,
      margin: "0",
      border: "none",
      outline: "none",
      background: "transparent",
      resize: opts.fixedWidth ? "vertical" : "none",
      overflow: "hidden",
      boxSizing: "content-box",
      whiteSpace: opts.fixedWidth ? "pre-wrap" : "pre",
      caretColor: opts.color,
      zIndex: "9999",
    });

    document.body.appendChild(input);

    let submitted = false;
    const cleanup = () => {
      input.removeEventListener("keydown", handleKeyDown);
      input.removeEventListener("input", autoSize);
      if (input.parentNode) document.body.removeChild(input);
    };

    const submit = (value: TextEditorResult | null) => {
      if (submitted) return;
      submitted = true;
      cleanup();
      resolve(value);
    };

    function autoSize() {
      input.style.height = "auto";
      if (!opts.fixedWidth) {
        input.style.width = `${Math.max(baseWidth * opts.zoom, input.scrollWidth + 2)}px`;
      }
      input.style.height = `${Math.max(minHeight * opts.zoom, input.scrollHeight)}px`;
    }

    function getResult(): TextEditorResult {
      const measured = measureTextBox(input.value, {
        fontFamily: opts.fontFamily,
        fontSize: opts.fontSize,
        fontWeight: opts.fontWeight,
        width: baseWidth,
        fixedWidth: opts.fixedWidth,
        zoom: opts.zoom,
      });
      return {
        text: measured.text,
        width: opts.fixedWidth ? baseWidth : measured.width,
        height: measured.height,
      };
    }

    function handleKeyDown(e: KeyboardEvent) {
      e.stopPropagation();
      if (e.key === "Tab") {
        // Keep Tab inside the editor (insert a literal tab) so users can
        // indent code-block contents instead of losing focus to the canvas.
        e.preventDefault();
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        input.value =
          input.value.slice(0, start) + "\t" + input.value.slice(end);
        input.selectionStart = input.selectionEnd = start + 1;
        autoSize();
        return;
      }
      if (e.key === "Escape") {
        // Commit the text on Escape (same as blur). The upstream callers
        // already guard against empty text so nothing is created if blank.
        e.preventDefault();
        submit(getResult());
        return;
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit(getResult());
      }
    }

    input.addEventListener("keydown", handleKeyDown);
    input.addEventListener("input", autoSize);
    input.addEventListener("blur", () => submit(getResult()), { once: true });

    autoSize();
    requestAnimationFrame(() => {
      input.focus();
      input.selectionStart = input.value.length;
      input.selectionEnd = input.value.length;
    });
  });
}
