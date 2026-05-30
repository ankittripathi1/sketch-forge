import rough from "roughjs";
import type { SketchElement } from "./types";
import { getBoundingBox, getElementsBoundingBox } from "./hitDetection";
import { isColorDark } from "@repo/common";
import { highlightCodeLine } from "./codeHighlight";

const imageCache = new Map<string, HTMLImageElement>();

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

function wrapRichSegments(
  ctx: CanvasRenderingContext2D,
  segments: RichTextSegment[],
  maxWidth: number,
  font: { weight: string; size: number; family: string },
): RichTextSegment[][] {
  const lines: RichTextSegment[][] = [];
  let current: RichTextSegment[] = [];
  let currentWidth = 0;

  const segmentFont = (kind: RichTextSegment["kind"]) =>
    kind === "code"
      ? `500 ${font.size * 0.9}px "Geist Mono", monospace`
      : kind === "math"
        ? `italic 600 ${font.size}px Georgia, "Times New Roman", serif`
        : `${font.weight} ${font.size}px ${font.family}`;

  const measure = (segment: RichTextSegment) => {
    ctx.font = segmentFont(segment.kind);
    return ctx.measureText(
      segment.kind === "math" ? latexToDisplayText(segment.text) : segment.text,
    ).width;
  };

  const pushLine = () => {
    lines.push(current.length ? current : [{ text: " ", kind: "plain" }]);
    current = [];
    currentWidth = 0;
  };

  for (const segment of segments) {
    if (segment.kind !== "plain") {
      const width = measure(segment);
      if (current.length && currentWidth + width > maxWidth) pushLine();
      current.push(segment);
      currentWidth += width;
      continue;
    }

    const tokens = segment.text.split(/(\s+)/);
    for (const token of tokens) {
      if (!token) continue;
      const width = measure({ text: token, kind: "plain" });
      if (current.length && currentWidth + width > maxWidth) {
        pushLine();
        if (/^\s+$/.test(token)) continue;
      }

      if (width > maxWidth && !/^\s+$/.test(token)) {
        let chunk = "";
        for (const char of token) {
          const test = chunk + char;
          const testWidth = measure({ text: test, kind: "plain" });
          if (chunk && testWidth > maxWidth) {
            current.push({ text: chunk, kind: "plain" });
            pushLine();
            chunk = char;
          } else {
            chunk = test;
          }
        }
        if (chunk) {
          current.push({ text: chunk, kind: "plain" });
          currentWidth += measure({ text: chunk, kind: "plain" });
        }
        continue;
      }

      current.push({ text: token, kind: "plain" });
      currentWidth += width;
    }
  }

  if (current.length) pushLine();
  return lines;
}

type RichTextSegment = {
  text: string;
  kind: "plain" | "code" | "link" | "math";
};
type RichTextLine =
  | {
      kind: "heading";
      level: 1 | 2 | 3;
      text: string;
    }
  | {
      kind: "check";
      checked: boolean;
      text: string;
    }
  | {
      kind: "bullet" | "ordered" | "paragraph";
      text: string;
      marker?: string;
    }
  | {
      kind: "codeblock";
      language: string;
      lines: string[];
    }
  | {
      kind: "equation";
      text: string;
    };
type CalloutKind = "note" | "warning" | "definition" | "assumption" | "key";

const CALLOUT_META: Record<
  CalloutKind,
  { label: string; accent: string; subtle: string }
> = {
  note: {
    label: "Note",
    accent: "#5a8ae8",
    subtle: "rgba(90, 138, 232, 0.12)",
  },
  warning: {
    label: "Warning",
    accent: "#e8845a",
    subtle: "rgba(232, 132, 90, 0.14)",
  },
  definition: {
    label: "Definition",
    accent: "#5ab98a",
    subtle: "rgba(90, 185, 138, 0.13)",
  },
  assumption: {
    label: "Assumption",
    accent: "#a06ae8",
    subtle: "rgba(160, 106, 232, 0.13)",
  },
  key: {
    label: "Key takeaway",
    accent: "#e8a830",
    subtle: "rgba(232, 168, 48, 0.14)",
  },
};

const LATEX_SYMBOLS: Record<string, string> = {
  "\\alpha": "α",
  "\\beta": "β",
  "\\gamma": "γ",
  "\\delta": "δ",
  "\\epsilon": "ε",
  "\\theta": "θ",
  "\\lambda": "λ",
  "\\mu": "μ",
  "\\pi": "π",
  "\\rho": "ρ",
  "\\sigma": "σ",
  "\\tau": "τ",
  "\\phi": "φ",
  "\\omega": "ω",
  "\\Delta": "Δ",
  "\\Sigma": "Σ",
  "\\Pi": "Π",
  "\\Omega": "Ω",
  "\\infty": "∞",
  "\\sum": "∑",
  "\\prod": "∏",
  "\\int": "∫",
  "\\partial": "∂",
  "\\nabla": "∇",
  "\\sqrt": "√",
  "\\cdot": "·",
  "\\times": "×",
  "\\div": "÷",
  "\\le": "≤",
  "\\leq": "≤",
  "\\ge": "≥",
  "\\geq": "≥",
  "\\ne": "≠",
  "\\neq": "≠",
  "\\approx": "≈",
  "\\equiv": "≡",
  "\\to": "→",
  "\\rightarrow": "→",
  "\\leftarrow": "←",
  "\\Rightarrow": "⇒",
  "\\in": "∈",
  "\\notin": "∉",
  "\\subset": "⊂",
  "\\subseteq": "⊆",
  "\\cup": "∪",
  "\\cap": "∩",
  "\\land": "∧",
  "\\lor": "∨",
};

const SUPER_DIGITS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
  i: "ⁱ",
};

const SUB_DIGITS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
};

function parseInlineRichText(text: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  const pattern = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\$(?!\$)(?:\\.|[^$])+\$)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index), kind: "plain" });
    }
    const value = match[0];
    if (value.startsWith("`")) {
      segments.push({ text: value.slice(1, -1), kind: "code" });
    } else if (value.startsWith("$")) {
      segments.push({ text: value.slice(1, -1), kind: "math" });
    } else {
      const label = value.match(/^\[([^\]]+)\]/)?.[1] ?? value;
      segments.push({ text: label, kind: "link" });
    }
    cursor = index + value.length;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), kind: "plain" });
  }
  return segments.length ? segments : [{ text, kind: "plain" }];
}

function parseRichTextLines(text: string): RichTextLine[] {
  const raw = text.split("\n");
  const out: RichTextLine[] = [];
  let i = 0;
  while (i < raw.length) {
    const line = raw[i]!.trimEnd();

    const equationFence = line.match(/^\$\$\s*(.*)$/);
    if (equationFence) {
      const lines: string[] = [];
      const first = equationFence[1] ?? "";
      if (first.trim() && !first.trim().endsWith("$$")) {
        lines.push(first);
      } else if (first.trim().endsWith("$$")) {
        out.push({
          kind: "equation",
          text: first.replace(/\$\$\s*$/, "").trim(),
        });
        i++;
        continue;
      }

      i++;
      while (i < raw.length && !/\$\$\s*$/.test(raw[i]!.trimEnd())) {
        lines.push(raw[i]!);
        i++;
      }
      if (i < raw.length) {
        lines.push(raw[i]!.replace(/\$\$\s*$/, ""));
        i++;
      }
      out.push({ kind: "equation", text: lines.join(" ").trim() });
      continue;
    }

    // Fenced code block: ```lang ... ```
    const fence = line.match(/^```\s*(\w*)\s*$/);
    if (fence) {
      const language = fence[1] || "";
      const lines: string[] = [];
      i++;
      while (i < raw.length && !/^```\s*$/.test(raw[i]!.trimEnd())) {
        lines.push(raw[i]!);
        i++;
      }
      // Consume the closing fence if present
      if (i < raw.length) i++;
      out.push({ kind: "codeblock", language, lines });
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      out.push({
        kind: "heading",
        level: heading[1]!.length as 1 | 2 | 3,
        text: heading[2]!,
      });
      i++;
      continue;
    }

    // Checklist: accept `[ ]`, `[x]`, optionally preceded by `- ` or `* `
    const checklist = line.match(/^(?:[-*]\s+)?\[([ xX])\]\s+(.+)$/);
    if (checklist) {
      out.push({
        kind: "check",
        checked: checklist[1]!.toLowerCase() === "x",
        text: checklist[2]!,
      });
      i++;
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      out.push({ kind: "bullet", text: bullet[1]! });
      i++;
      continue;
    }

    const ordered = line.match(/^(\d+[.)])\s+(.+)$/);
    if (ordered) {
      out.push({ kind: "ordered", marker: ordered[1]!, text: ordered[2]! });
      i++;
      continue;
    }

    out.push({ kind: "paragraph", text: line || " " });
    i++;
  }
  return out;
}

function replaceLatexScripts(input: string, marker: "^" | "_") {
  const map = marker === "^" ? SUPER_DIGITS : SUB_DIGITS;
  return input.replace(
    new RegExp(`\\${marker}(?:\\{([^}]+)\\}|([A-Za-z0-9()+\\-=]))`, "g"),
    (_match, group: string | undefined, single: string | undefined) => {
      const value = group ?? single ?? "";
      return value
        .split("")
        .map((char) => map[char] ?? char)
        .join("");
    },
  );
}

function latexToDisplayText(input: string) {
  let value = input.trim();
  value = value.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
  value = value.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");
  value = value.replace(/\\left|\\right/g, "");
  for (const [latex, symbol] of Object.entries(LATEX_SYMBOLS)) {
    value = value.replaceAll(latex, symbol);
  }
  value = replaceLatexScripts(value, "^");
  value = replaceLatexScripts(value, "_");
  value = value.replace(/[{}]/g, "");
  value = value.replace(/\\,/g, " ");
  value = value.replace(/\\/g, "");
  return value;
}

function drawMathText(
  ctx: CanvasRenderingContext2D,
  expression: string,
  x: number,
  y: number,
  options: {
    size: number;
    color: string;
    maxWidth: number;
    block?: boolean;
    center?: boolean;
  },
) {
  const text = latexToDisplayText(expression);
  const size = options.block ? options.size * 1.16 : options.size;
  ctx.font = `italic 600 ${size}px Georgia, "Times New Roman", serif`;
  ctx.textBaseline = "top";
  ctx.fillStyle = options.color;
  const width = ctx.measureText(text).width;
  const drawX =
    options.center && width < options.maxWidth
      ? x + (options.maxWidth - width) / 2
      : x;
  ctx.fillText(text, drawX, y, options.maxWidth);
  return {
    width: Math.min(width, options.maxWidth),
    height: size * 1.25,
  };
}

function parseCallout(text: string): {
  kind: CalloutKind;
  title: string;
  body: string;
} | null {
  const lines = text.split("\n");
  const first = lines[0]?.trim() ?? "";
  const match = first.match(
    /^>\s*\[!(NOTE|WARNING|DEFINITION|ASSUMPTION|KEY)\]\s*(.*)$/i,
  );
  if (!match) return null;
  const kind = match[1]!.toLowerCase() as CalloutKind;
  const title = match[2]?.trim() || CALLOUT_META[kind].label;
  const body = lines
    .slice(1)
    .map((line) => line.replace(/^>\s?/, ""))
    .join("\n")
    .trim();
  return { kind, title, body };
}

function drawRichSegments(
  ctx: CanvasRenderingContext2D,
  segments: RichTextSegment[],
  x: number,
  y: number,
  maxWidth: number,
  colors: { text: string; codeBg: string; codeText: string; link: string },
  font: { weight: string; size: number; family: string },
) {
  let cursorX = x;
  ctx.textBaseline = "top";
  for (const segment of segments) {
    const segmentFont =
      segment.kind === "code"
        ? `500 ${font.size * 0.9}px "Geist Mono", monospace`
        : `${font.weight} ${font.size}px ${font.family}`;
    ctx.font = segmentFont;
    const width = ctx.measureText(segment.text).width;
    if (cursorX + width > x + maxWidth && cursorX > x) break;

    if (segment.kind === "code") {
      const padX = font.size * 0.28;
      const padY = font.size * 0.12;
      ctx.fillStyle = colors.codeBg;
      roundedRectPath(
        ctx,
        cursorX - padX,
        y - padY,
        width + padX * 2,
        font.size * 1.18,
        font.size * 0.22,
      );
      ctx.fill();
      ctx.fillStyle = colors.codeText;
      ctx.fillText(segment.text, cursorX, y);
    } else if (segment.kind === "link") {
      ctx.fillStyle = colors.link;
      ctx.fillText(segment.text, cursorX, y);
      ctx.strokeStyle = colors.link;
      ctx.lineWidth = Math.max(1, font.size * 0.06);
      ctx.beginPath();
      ctx.moveTo(cursorX, y + font.size * 1.08);
      ctx.lineTo(cursorX + width, y + font.size * 1.08);
      ctx.stroke();
    } else if (segment.kind === "math") {
      const rendered = latexToDisplayText(segment.text);
      ctx.font = `italic 600 ${font.size}px Georgia, "Times New Roman", serif`;
      const mathWidth = ctx.measureText(rendered).width;
      if (cursorX + mathWidth > x + maxWidth && cursorX > x) break;
      ctx.fillStyle = colors.link;
      ctx.fillText(rendered, cursorX, y);
      cursorX += mathWidth;
      continue;
    } else {
      ctx.fillStyle = colors.text;
      ctx.fillText(segment.text, cursorX, y);
    }
    cursorX += width;
  }
}

function drawWrappedRichSegments(
  ctx: CanvasRenderingContext2D,
  segments: RichTextSegment[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  bottom: number,
  colors: { text: string; codeBg: string; codeText: string; link: string },
  font: { weight: string; size: number; family: string },
) {
  let cursorY = y;
  const wrapped = wrapRichSegments(ctx, segments, maxWidth, font);
  for (const visualLine of wrapped) {
    if (cursorY > bottom - font.size) break;
    drawRichSegments(ctx, visualLine, x, cursorY, maxWidth, colors, font);
    cursorY += lineHeight;
  }
  return cursorY;
}

function drawRichTextBlock(
  ctx: CanvasRenderingContext2D,
  el: SketchElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const fontSz = el.fontSize ?? el.strokeWidth * 10 + 4;
  const fontFam = el.fontFamily ?? "Kalam, cursive";
  const fontWt = el.fontWeight ?? "normal";
  const darkText = isColorDark(el.strokeColor);
  const linkColor = darkText ? "#3b82f6" : "#93c5fd";
  const codeBg = darkText ? "rgba(36,48,68,0.09)" : "rgba(255,255,255,0.12)";
  const codeText = darkText ? "#243044" : "#f5f5f0";
  // Padding is intentionally small: the stored bbox (from openTextEditor) is
  // sized as lines * fontSize * 1.2 with no padding, so anything larger here
  // would push content outside the bbox and trip the clip check below before
  // the first line draws.
  const pad = Math.max(2, fontSz * 0.08);
  const maxWidth = Math.max(w - pad * 2, 24);
  let cursorY = y + pad;

  const callout = parseCallout(el.text ?? "");
  if (callout) {
    const meta = CALLOUT_META[callout.kind];
    ctx.save();
    ctx.fillStyle = meta.subtle;
    roundedRectPath(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.fillStyle = meta.accent;
    roundedRectPath(ctx, x, y, Math.max(4, fontSz * 0.22), h, 12);
    ctx.fill();
    ctx.font = `700 ${fontSz * 0.86}px ${fontFam}`;
    ctx.textBaseline = "top";
    ctx.fillStyle = meta.accent;
    ctx.fillText(meta.label.toUpperCase(), x + pad + 8, cursorY);
    cursorY += fontSz * 1.32;
    ctx.font = `700 ${fontSz * 1.08}px ${fontFam}`;
    ctx.fillStyle = el.strokeColor;
    ctx.fillText(callout.title, x + pad + 8, cursorY);
    cursorY += fontSz * 1.5;
    for (const line of wrapText(ctx, callout.body, maxWidth - 8)) {
      if (cursorY > y + h - fontSz) break;
      ctx.font = `${fontWt} ${fontSz}px ${fontFam}`;
      ctx.fillStyle = el.strokeColor;
      ctx.fillText(line, x + pad + 8, cursorY);
      cursorY += fontSz * 1.32;
    }
    ctx.restore();
    return;
  }

  for (const line of parseRichTextLines(el.text ?? "")) {
    if (cursorY > y + h - fontSz) break;
    if (line.kind === "heading") {
      const scale = line.level === 1 ? 1.55 : line.level === 2 ? 1.28 : 1.12;
      const size = fontSz * scale;
      ctx.font = `700 ${size}px ${fontFam}`;
      ctx.fillStyle = el.strokeColor;
      ctx.textBaseline = "top";
      ctx.fillText(line.text, x + pad, cursorY);
      cursorY += size * 1.2;
      continue;
    }

    if (line.kind === "codeblock") {
      const codeFontSz = fontSz * 0.92;
      const codeLineH = codeFontSz * 1.35;
      const blockPad = fontSz * 0.5;
      const renderedLines = line.lines.length > 0 ? line.lines : [""];
      const blockH = renderedLines.length * codeLineH + blockPad * 2;
      ctx.save();
      ctx.fillStyle = codeBg;
      roundedRectPath(ctx, x + pad, cursorY, w - pad * 2, blockH, 8);
      ctx.fill();
      if (line.language) {
        ctx.font = `600 ${fontSz * 0.7}px "Geist Mono", monospace`;
        ctx.fillStyle = codeText;
        ctx.globalAlpha = 0.6;
        const label = line.language.toUpperCase();
        const labelW = ctx.measureText(label).width;
        ctx.textBaseline = "top";
        ctx.fillText(label, x + pad + (w - pad * 2) - labelW - 8, cursorY + 6);
        ctx.globalAlpha = 1;
      }
      ctx.font = `500 ${codeFontSz}px "Geist Mono", monospace`;
      ctx.textBaseline = "top";
      let cy = cursorY + blockPad;
      for (const codeLine of renderedLines) {
        const expanded = codeLine.replace(/\t/g, "    ");
        const tokens = highlightCodeLine(expanded, line.language, darkText);
        let cxToken = x + pad + blockPad;
        for (const t of tokens) {
          if (!t.text) continue;
          ctx.fillStyle = t.color;
          ctx.fillText(t.text, cxToken, cy);
          cxToken += ctx.measureText(t.text).width;
        }
        cy += codeLineH;
      }
      ctx.restore();
      cursorY += blockH + fontSz * 0.3;
      continue;
    }

    if (line.kind === "equation") {
      const equationPad = fontSz * 0.5;
      const equationH = fontSz * 2.2;
      ctx.save();
      ctx.fillStyle = codeBg;
      roundedRectPath(ctx, x + pad, cursorY, w - pad * 2, equationH, 10);
      ctx.fill();
      drawMathText(
        ctx,
        line.text,
        x + pad + equationPad,
        cursorY + fontSz * 0.45,
        {
          size: fontSz,
          color: el.strokeColor,
          maxWidth: Math.max(24, w - pad * 2 - equationPad * 2),
          block: true,
          center: true,
        },
      );
      ctx.restore();
      cursorY += equationH + fontSz * 0.35;
      continue;
    }

    const markerX = x + pad;
    const textX = x + pad + fontSz * 1.35;
    const lineH = fontSz * 1.2;
    ctx.font = `${fontWt} ${fontSz}px ${fontFam}`;
    ctx.textBaseline = "top";

    if (line.kind === "check") {
      const box = fontSz * 0.72;
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = Math.max(1, fontSz * 0.08);
      roundedRectPath(ctx, markerX, cursorY + fontSz * 0.16, box, box, 3);
      ctx.stroke();
      if (line.checked) {
        ctx.beginPath();
        ctx.moveTo(markerX + box * 0.2, cursorY + box * 0.52);
        ctx.lineTo(markerX + box * 0.44, cursorY + box * 0.78);
        ctx.lineTo(markerX + box * 0.84, cursorY + box * 0.28);
        ctx.stroke();
      }
    } else if (line.kind === "bullet") {
      ctx.fillStyle = el.strokeColor;
      ctx.beginPath();
      ctx.arc(
        markerX + fontSz * 0.34,
        cursorY + fontSz * 0.54,
        fontSz * 0.14,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else if (line.kind === "ordered") {
      ctx.fillStyle = el.strokeColor;
      ctx.fillText(line.marker ?? "1.", markerX, cursorY);
    }

    const drawX = line.kind === "paragraph" ? x + pad : textX;
    cursorY = drawWrappedRichSegments(
      ctx,
      parseInlineRichText(line.text),
      drawX,
      cursorY,
      line.kind === "paragraph" ? maxWidth : maxWidth - fontSz * 1.35,
      lineH,
      y + h,
      {
        text: el.strokeColor,
        codeBg,
        codeText,
        link: linkColor,
      },
      { weight: fontWt, size: fontSz, family: fontFam },
    );
  }
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

import type { AnchorSide } from "./types";

// Anchor + arrow-binding geometry lives in @repo/element. Imported for internal
// use and re-exported so existing importers of "@repo/canvas-core/renderElement"
// keep working.
import {
  getAnchorPoint,
  getAllAnchorPoints,
  resolveArrowEndpoints,
} from "@repo/element/binding";
export { getAnchorPoint, getAllAnchorPoints, resolveArrowEndpoints };

/**
 * Returns the quadratic-bezier control point for a bent arrow: the line
 * midpoint pushed perpendicular by `bend` units.
 */
export function getArrowControlPoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bend: number,
): { x: number; y: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular unit vector (rotated 90° CCW from the line direction)
  const nx = -dy / len;
  const ny = dx / len;
  return { x: mx + nx * bend, y: my + ny * bend };
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  strokeWidth: number,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLen = Math.max(10, strokeWidth * 4);
  const a1 = angle - Math.PI / 6;
  const a2 = angle + Math.PI / 6;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(a1), toY - headLen * Math.sin(a1));
  ctx.lineTo(toX - headLen * Math.cos(a2), toY - headLen * Math.sin(a2));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawElement(
  rc: ReturnType<typeof rough.canvas>,
  el: SketchElement,
  onImageLoad?: () => void,
  allElements?: SketchElement[],
) {
  const hasFill = el.fillStyle !== "none" && el.fillColor !== "none";

  const opts = {
    seed: el.seed,
    roughness: 1.2,
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    fill: hasFill ? el.fillColor : undefined,
    fillStyle: el.fillStyle === "solid" ? "solid" : "hachure",
  } as const;

  const drawWithOpacity = (draw: () => void) => {
    if (el.opacity === undefined) {
      draw();
      return;
    }
    const ctx = (rc as any).canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.save();
    ctx.globalAlpha = el.opacity;
    draw();
    ctx.restore();
  };

  if (el.tool === "rectangle") {
    rc.rectangle(el.x1, el.y1, el.x2 - el.x1, el.y2 - el.y1, opts);
  } else if (el.tool === "ellipse") {
    rc.ellipse(
      (el.x1 + el.x2) / 2,
      (el.y1 + el.y2) / 2,
      Math.abs(el.x2 - el.x1),
      Math.abs(el.y2 - el.y1),
      opts,
    );
  } else if (el.tool === "diamond") {
    const minX = Math.min(el.x1, el.x2);
    const maxX = Math.max(el.x1, el.x2);
    const minY = Math.min(el.y1, el.y2);
    const maxY = Math.max(el.y1, el.y2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    rc.polygon(
      [
        [cx, minY],
        [maxX, cy],
        [cx, maxY],
        [minX, cy],
      ],
      opts,
    );
  } else if (el.tool === "line") {
    rc.line(el.x1, el.y1, el.x2, el.y2, opts);
  } else if (el.tool === "arrow") {
    const ends = resolveArrowEndpoints(el, allElements ?? []);
    const ctx = (rc as any).canvas.getContext("2d") as CanvasRenderingContext2D;
    const bend = el.bend ?? 0;
    if (Math.abs(bend) > 0.5) {
      const cp = getArrowControlPoint(ends.x1, ends.y1, ends.x2, ends.y2, bend);
      rc.path(
        `M ${ends.x1} ${ends.y1} Q ${cp.x} ${cp.y} ${ends.x2} ${ends.y2}`,
        opts,
      );
      // Arrowhead aligned with the curve's tangent at the end point: for a
      // quadratic bezier B(t)=P0(1-t)²+2P1 t(1-t)+P2 t², B'(1) = 2(P2-P1).
      drawArrowhead(
        ctx,
        cp.x,
        cp.y,
        ends.x2,
        ends.y2,
        el.strokeColor,
        el.strokeWidth,
      );
    } else {
      rc.line(ends.x1, ends.y1, ends.x2, ends.y2, opts);
      drawArrowhead(
        ctx,
        ends.x1,
        ends.y1,
        ends.x2,
        ends.y2,
        el.strokeColor,
        el.strokeWidth,
      );
    }
  } else if (el.tool === "highlighter" && el.points && el.points.length > 1) {
    const ctx = (rc as any).canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.save();
    ctx.globalAlpha = el.opacity ?? 0.35;
    ctx.globalCompositeOperation = "multiply";
    ctx.strokeStyle = el.strokeColor;
    ctx.lineWidth = el.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(el.points[0]!.x, el.points[0]!.y);
    for (const point of el.points.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
  } else if (el.tool === "freehand" && el.points && el.points.length > 1) {
    const path = el.points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
      .join(" ");
    drawWithOpacity(() => rc.path(path, opts));
  } else if (el.tool === "text" && el.text) {
    const ctx = (rc as any).canvas.getContext("2d") as CanvasRenderingContext2D;
    const { x, y, w, h } = getBoundingBox(el);
    ctx.save();
    drawRichTextBlock(ctx, el, x, y, w, h);
    ctx.restore();
  } else if (el.tool === "image" && el.src) {
    const ctx = (rc as any).canvas.getContext("2d") as CanvasRenderingContext2D;
    // Image constructor is not available in Web Workers.
    if (typeof Image === "undefined") return;

    let img = imageCache.get(el.src);
    if (!img) {
      img = new Image();
      img.onload = () => onImageLoad?.();
      img.src = el.src;
      imageCache.set(el.src, img);
    }
    if (img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.drawImage(img, el.x1, el.y1, el.x2 - el.x1, el.y2 - el.y1);
      ctx.restore();
    }
  }

  if (
    el.text &&
    el.tool !== "text" &&
    el.tool !== "image" &&
    el.tool !== "eraser" &&
    el.tool !== "highlighter" &&
    el.tool !== "line" &&
    el.tool !== "arrow" &&
    el.tool !== "freehand"
  ) {
    const ctx = (rc as any).canvas.getContext("2d") as CanvasRenderingContext2D;
    const { x, y, w, h } = getBoundingBox(el);
    const fontSize = el.fontSize ?? el.strokeWidth * 10 + 4;
    const fontFam = el.fontFamily ?? "Kalam, cursive";
    const fontWt = el.fontWeight ?? "normal";
    const align = el.textAlign ?? "center";
    const vAlign = el.textVerticalAlign ?? "middle";
    ctx.save();
    ctx.font = `${fontWt} ${fontSize}px ${fontFam}`;
    ctx.fillStyle = el.strokeColor;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";

    const pad = Math.max(8, fontSize * 0.5);
    const maxW = Math.max(w - pad * 2, 1);
    const lineH = fontSize * 1.5;
    const lines = wrapText(ctx, el.text, maxW);
    const totalH = lines.length * lineH;

    let anchorX: number;
    if (align === "left") anchorX = x + pad;
    else if (align === "right") anchorX = x + w - pad;
    else anchorX = x + w / 2;

    let startY: number;
    if (vAlign === "top") startY = y + pad + lineH / 2;
    else if (vAlign === "bottom") startY = y + h - pad - totalH + lineH / 2;
    else startY = y + h / 2 - totalH / 2 + lineH / 2;

    lines.forEach((line, i) => ctx.fillText(line, anchorX, startY + i * lineH));

    ctx.restore();
  }
}

/**
 * Renders the four edge anchor dots on a shape, highlighting the one the
 * cursor is currently snapping to. Drawn on the interaction canvas while the
 * user is drawing or moving an arrow endpoint.
 */
export function drawAnchorHints(
  ctx: CanvasRenderingContext2D,
  shape: SketchElement,
  activeAnchor: AnchorSide | null,
  zoom = 1,
) {
  const r = 5 / zoom;
  const lw = 1.5 / zoom;
  ctx.save();
  for (const a of getAllAnchorPoints(shape)) {
    const isActive = a.side === activeAnchor;
    ctx.beginPath();
    ctx.arc(a.x, a.y, isActive ? r * 1.4 : r, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? "#6366f1" : "#ffffff";
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = lw;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  el: SketchElement,
  zoom = 1,
  allElements: SketchElement[] = [],
) {
  if (el.tool === "arrow") {
    const r = 4 / zoom;
    const lw = 1.5 / zoom;
    const ends = resolveArrowEndpoints(el, allElements);
    const bend = el.bend ?? 0;
    const mid =
      Math.abs(bend) > 0.5
        ? getArrowControlPoint(ends.x1, ends.y1, ends.x2, ends.y2, bend)
        : { x: (ends.x1 + ends.x2) / 2, y: (ends.y1 + ends.y2) / 2 };
    ctx.save();
    ctx.strokeStyle = "#6366f1";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = lw;
    for (const p of [
      { x: ends.x1, y: ends.y1 },
      mid,
      { x: ends.x2, y: ends.y2 },
    ]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const { x, y, w, h } = getBoundingBox(el);
  const pad = 6 / zoom;
  const r = 4 / zoom;
  const lw = 1.5 / zoom;

  ctx.save();
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = lw;
  ctx.setLineDash([5 / zoom, 3 / zoom]);
  ctx.strokeRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
  ctx.setLineDash([]);

  const handles: [number, number][] = [
    [x - pad, y - pad],
    [x + w / 2, y - pad],
    [x + w + pad, y - pad],
    [x - pad, y + h / 2],
    [x + w + pad, y + h / 2],
    [x - pad, y + h + pad],
    [x + w / 2, y + h + pad],
    [x + w + pad, y + h + pad],
  ];

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = lw;
  for (const [hx, hy] of handles) {
    ctx.beginPath();
    ctx.arc(hx, hy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawGroupSelectionBox(
  ctx: CanvasRenderingContext2D,
  elements: SketchElement[],
  zoom = 1,
) {
  if (elements.length === 0) return;

  const { x, y, w, h } = getElementsBoundingBox(elements);
  const pad = 8 / zoom;
  const lw = 1.5 / zoom;

  ctx.save();
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = lw;
  ctx.setLineDash([7 / zoom, 4 / zoom]);
  ctx.strokeRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
  ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
  ctx.restore();
}
