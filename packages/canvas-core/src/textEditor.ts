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

const LINE_HEIGHT = 1.2;

/**
 * Per-line height multiplier the renderer (drawRichTextBlock) uses, based on
 * the markdown-ish prefix of the line. Keep in sync with renderElement.ts.
 */
function richLineScale(rawLine: string): number {
  const line = rawLine.trimEnd();
  const heading = line.match(/^(#{1,3})\s+/);
  if (heading) {
    const level = heading[1]!.length;
    if (level === 1) return 1.55;
    if (level === 2) return 1.28;
    return 1.12;
  }
  return 1.0;
}

function wrapMeasuredLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  maxWidth: number,
) {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return [line || " "];
  const words = (line || " ").split(/(\s+)/);
  const wrapped: string[] = [];
  let current = "";

  for (const word of words) {
    if (!word) continue;
    const test = current ? `${current}${word}` : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      wrapped.push(current.trimEnd() || " ");
      current = /^\s+$/.test(word) ? "" : word;
      continue;
    }
    current = test;
  }

  if (current || wrapped.length === 0) wrapped.push(current.trimEnd() || " ");
  return wrapped;
}

export function measureTextBox(
  text: string,
  opts: {
    fontFamily: string;
    fontSize: number;
    fontWeight: "normal" | "bold";
    width?: number;
    fixedWidth?: boolean;
    zoom?: number;
  },
) {
  const zoom = opts.zoom ?? 1;
  const scaledFontSize = opts.fontSize * zoom;
  const font = `${opts.fontWeight} ${scaledFontSize}px ${opts.fontFamily}`;
  const pad = Math.max(2, opts.fontSize * 0.08);
  const scaledPad = pad * zoom;
  const fallbackWidth = Math.max((opts.width ?? 20) * zoom, 20);
  const maxContentWidth = Math.max(fallbackWidth - scaledPad * 2, 1);
  return measureText(
    text,
    font,
    scaledFontSize,
    fallbackWidth,
    opts.fixedWidth ? maxContentWidth : undefined,
    pad,
    zoom,
  );
}

function measureText(
  text: string,
  font: string,
  fontSize: number,
  fallbackWidth: number,
  wrapWidth?: number,
  pad = 0,
  zoom = 1,
) {
  const cleaned = text.replace(/\n+$/, "");
  const lines = (cleaned || " ").split("\n");
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = font;
  const measuredLines = wrapWidth
    ? lines.flatMap((line) => wrapMeasuredLine(ctx, line, wrapWidth))
    : lines;
  const width = Math.max(
    fallbackWidth,
    ...measuredLines.map((line) => ctx.measureText(line || " ").width),
  );

  // Walk lines with a small state machine so fenced code blocks contribute
  // their own height (line count * 1.2 plus a block padding) rather than
  // being summed as regular lines (which would also incorrectly apply
  // heading-scale to text inside the fence).
  let totalLineHeight = 0;
  let inFence = false;
  let fenceLines = 0;
  const flushFence = () => {
    if (!inFence) return;
    const codeFontSz = fontSize * 0.92;
    const codeLineH = codeFontSz * 1.35;
    const blockPad = fontSize * 0.5;
    const renderedCount = Math.max(1, fenceLines);
    totalLineHeight +=
      renderedCount * codeLineH + blockPad * 2 + fontSize * 0.3;
    inFence = false;
    fenceLines = 0;
  };
  for (const rawLine of lines) {
    const trimmed = rawLine.trimEnd();
    if (!inFence && /^```\s*\w*\s*$/.test(trimmed)) {
      inFence = true;
      fenceLines = 0;
      continue;
    }
    if (inFence && /^```\s*$/.test(trimmed)) {
      flushFence();
      continue;
    }
    if (inFence) {
      fenceLines++;
      continue;
    }
    const visualLines = wrapWidth
      ? wrapMeasuredLine(ctx, rawLine, wrapWidth)
      : [rawLine];
    totalLineHeight +=
      visualLines.length * fontSize * richLineScale(rawLine) * LINE_HEIGHT;
  }
  // Unterminated fence: still count its lines.
  flushFence();

  return {
    text: cleaned,
    width: width / zoom + pad * 2,
    height: Math.max(fontSize * LINE_HEIGHT, totalLineHeight) / zoom + pad * 2,
  };
}

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
