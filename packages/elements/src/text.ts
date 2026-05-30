export const LINE_HEIGHT = 1.2;

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
