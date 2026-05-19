import rough from "roughjs";
import type { SketchElement } from "./types";
import { getBoundingBox } from "./hitDetection";
import { isColorDark } from "./colorUtils";

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

const JS_KEYWORDS = new Set([
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "import",
  "let",
  "new",
  "return",
  "switch",
  "throw",
  "try",
  "typeof",
  "var",
  "while",
]);

const TS_KEYWORDS = new Set([
  ...JS_KEYWORDS,
  "abstract",
  "as",
  "declare",
  "enum",
  "implements",
  "interface",
  "keyof",
  "namespace",
  "private",
  "protected",
  "public",
  "readonly",
  "type",
]);

const PYTHON_KEYWORDS = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "False",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "None",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "True",
  "try",
  "while",
  "with",
  "yield",
]);

const JAVA_KEYWORDS = new Set([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "final",
  "finally",
  "float",
  "for",
  "if",
  "implements",
  "import",
  "instanceof",
  "int",
  "interface",
  "long",
  "new",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "try",
  "void",
  "volatile",
  "while",
]);

type CodeLanguage = NonNullable<SketchElement["codeLanguage"]>;
type CodeToken = {
  text: string;
  kind: "plain" | "keyword" | "string" | "number" | "comment" | "function";
};

function getCodeKeywords(language: CodeLanguage | undefined) {
  if (language === "python") return PYTHON_KEYWORDS;
  if (language === "java") return JAVA_KEYWORDS;
  if (language === "typescript") return TS_KEYWORDS;
  return JS_KEYWORDS;
}

function tokenizeCodeLine(
  line: string,
  language: CodeLanguage | undefined,
): CodeToken[] {
  const tokens: CodeToken[] = [];
  const keywords = getCodeKeywords(language);
  let i = 0;

  while (i < line.length) {
    const rest = line.slice(i);
    const comment = rest.match(language === "python" ? /^#.*/ : /^\/\/.*/);
    if (comment) {
      tokens.push({ text: comment[0], kind: "comment" });
      break;
    }

    const string = rest.match(/^(['"`])(?:\\.|(?!\1).)*\1/);
    if (string) {
      tokens.push({ text: string[0], kind: "string" });
      i += string[0].length;
      continue;
    }

    const number = rest.match(/^\b\d+(?:\.\d+)?\b/);
    if (number) {
      tokens.push({ text: number[0], kind: "number" });
      i += number[0].length;
      continue;
    }

    const word = rest.match(/^[A-Za-z_$][\w$]*/);
    if (word) {
      const next = line.slice(i + word[0].length).trimStart();
      const kind = keywords.has(word[0])
        ? "keyword"
        : next.startsWith("(")
          ? "function"
          : "plain";
      tokens.push({ text: word[0], kind });
      i += word[0].length;
      continue;
    }

    tokens.push({ text: line[i]!, kind: "plain" });
    i += 1;
  }

  return tokens;
}

function getCodeTokenColor(
  kind: CodeToken["kind"],
  darkBlock: boolean,
  fallback: string,
) {
  if (kind === "keyword") return darkBlock ? "#d8b4fe" : "#9333ea";
  if (kind === "string") return darkBlock ? "#86efac" : "#15803d";
  if (kind === "number") return darkBlock ? "#fdba74" : "#b45309";
  if (kind === "comment") return darkBlock ? "#94a3b8" : "#64748b";
  if (kind === "function") return darkBlock ? "#93c5fd" : "#2563eb";
  return fallback;
}

function getCodeLanguageLabel(language: CodeLanguage | undefined) {
  if (language === "typescript") return "TypeScript";
  if (language === "python") return "Python";
  if (language === "java") return "Java";
  return "JavaScript";
}

function getCodeLanguageAccent(language: CodeLanguage | undefined) {
  if (language === "typescript") return "#3178c6";
  if (language === "python") return "#2f80ed";
  if (language === "java") return "#e76f51";
  return "#f0b429";
}

import type { AnchorSide } from "./types";

/** Returns the canvas-space point for the named anchor on a shape's bbox. */
export function getAnchorPoint(
  shape: SketchElement,
  anchor: AnchorSide,
): { x: number; y: number } {
  const { x, y, w, h } = getBoundingBox(shape);
  if (anchor === "top") return { x: x + w / 2, y };
  if (anchor === "bottom") return { x: x + w / 2, y: y + h };
  if (anchor === "left") return { x, y: y + h / 2 };
  return { x: x + w, y: y + h / 2 };
}

/** Returns all four edge anchor points for hover-feedback rendering. */
export function getAllAnchorPoints(
  shape: SketchElement,
): { side: AnchorSide; x: number; y: number }[] {
  return (["top", "right", "bottom", "left"] as const).map((side) => ({
    side,
    ...getAnchorPoint(shape, side),
  }));
}

/**
 * Resolves an arrow element's endpoints from any bindings. For unbound arrows
 * (or non-arrows) returns the literal stored coordinates.
 */
export function resolveArrowEndpoints(
  el: SketchElement,
  allElements: SketchElement[],
): { x1: number; y1: number; x2: number; y2: number } {
  if (el.tool !== "arrow" || (!el.startBinding && !el.endBinding)) {
    return { x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2 };
  }
  let x1 = el.x1;
  let y1 = el.y1;
  let x2 = el.x2;
  let y2 = el.y2;

  if (el.startBinding) {
    const shape = allElements.find((e) => e.id === el.startBinding!.elementId);
    if (shape) {
      const p = getAnchorPoint(shape, el.startBinding.anchor);
      x1 = p.x;
      y1 = p.y;
    }
  }
  if (el.endBinding) {
    const shape = allElements.find((e) => e.id === el.endBinding!.elementId);
    if (shape) {
      const p = getAnchorPoint(shape, el.endBinding.anchor);
      x2 = p.x;
      y2 = p.y;
    }
  }
  return { x1, y1, x2, y2 };
}

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
    const fontSz = el.fontSize ?? el.strokeWidth * 10 + 4;
    const fontFam = el.fontFamily ?? "Kalam, cursive";
    const fontWt = el.fontWeight ?? "normal";
    const LINE_HEIGHT = 1.2;
    ctx.save();
    ctx.font = `${fontWt} ${fontSz}px ${fontFam}`;
    ctx.textBaseline = "top";
    ctx.fillStyle = el.strokeColor;

    const maxWidth = Math.abs(el.x2 - el.x1);
    const lines =
      maxWidth > 20 ? wrapText(ctx, el.text, maxWidth) : el.text.split("\n");

    lines.forEach((line, i) => {
      ctx.fillText(line, el.x1, el.y1 + i * fontSz * LINE_HEIGHT);
    });
    ctx.restore();
  } else if (el.tool === "code") {
    const ctx = (rc as any).canvas.getContext("2d") as CanvasRenderingContext2D;
    const { x, y, w, h } = getBoundingBox(el);
    const fontSz = el.fontSize ?? 14;
    const fontFam = el.fontFamily ?? "Geist Mono, monospace";
    const lineH = fontSz * 1.45;
    const padX = 18;
    const headerH = 32;
    const bodyTop = y + headerH + 10;
    const radius = 10;
    const lines = (el.text ?? "").split("\n");
    const isEmpty = (el.text ?? "").length === 0;
    const darkBlock = !isColorDark(el.strokeColor);
    const textColor = darkBlock ? "#e8e6d8" : "#243044";
    const mutedTextColor = darkBlock
      ? "rgba(226,232,240,0.46)"
      : "rgba(71,85,105,0.48)";
    const blockBg = darkBlock
      ? "rgba(12, 12, 18, 0.88)"
      : "rgba(255, 255, 255, 0.94)";
    const headerBg = darkBlock
      ? "rgba(255,255,255,0.045)"
      : "rgba(15,23,42,0.035)";
    const borderColor = darkBlock
      ? "rgba(255,255,255,0.18)"
      : "rgba(15,23,42,0.14)";
    const accent = getCodeLanguageAccent(el.codeLanguage);

    ctx.save();
    ctx.fillStyle = blockBg;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = Math.max(1, el.strokeWidth || 1);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();
    ctx.fillStyle = headerBg;
    ctx.fillRect(x, y, w, headerH);
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, 3, headerH);
    ctx.restore();

    const label = getCodeLanguageLabel(el.codeLanguage);
    ctx.font = `700 ${Math.max(10, fontSz * 0.72)}px ${fontFam}`;
    const badgePadX = 7;
    const badgeH = 20;
    const badgeW = ctx.measureText(label).width + badgePadX * 2;
    const badgeX = x + w - badgeW - 12;
    const badgeY = y + (headerH - badgeH) / 2;
    ctx.fillStyle = darkBlock
      ? "rgba(255,255,255,0.10)"
      : "rgba(15,23,42,0.06)";
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.textBaseline = "middle";
    ctx.fillText(label, badgeX + badgePadX, badgeY + badgeH / 2);

    ctx.font = `normal ${fontSz}px ${fontFam}`;
    ctx.textBaseline = "top";
    if (isEmpty) {
      ctx.fillStyle = mutedTextColor;
      ctx.fillText("Empty code block", x + padX, bodyTop);
    } else {
      lines.forEach((line, i) => {
        let cursorX = x + padX;
        const baselineY = bodyTop + i * lineH;
        for (const token of tokenizeCodeLine(line, el.codeLanguage)) {
          ctx.fillStyle = getCodeTokenColor(token.kind, darkBlock, textColor);
          ctx.fillText(token.text, cursorX, baselineY);
          cursorX += ctx.measureText(token.text).width;
        }
      });
    }
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
    el.tool !== "code" &&
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
  ctx.strokeStyle =
    el.tool === "code" ? "rgba(129, 140, 248, 0.78)" : "#6366f1";
  ctx.lineWidth = lw;
  ctx.setLineDash(
    el.tool === "code" ? [8 / zoom, 5 / zoom] : [5 / zoom, 3 / zoom],
  );
  if (el.tool === "code") {
    ctx.beginPath();
    ctx.roundRect(x - pad, y - pad, w + pad * 2, h + pad * 2, 12 / zoom);
    ctx.stroke();
  } else {
    ctx.strokeRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
  }
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
  ctx.strokeStyle = el.tool === "code" ? "rgba(129, 140, 248, 0.9)" : "#6366f1";
  ctx.lineWidth = lw;
  for (const [hx, hy] of handles) {
    ctx.beginPath();
    ctx.arc(hx, hy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
