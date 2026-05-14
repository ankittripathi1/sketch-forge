import rough from "roughjs";
import type { SketchElement } from "./types";
import { getBoundingBox } from "./hitDetection";

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

export function drawElement(
  rc: ReturnType<typeof rough.canvas>,
  el: SketchElement,
  onImageLoad?: () => void,
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
  } else if (el.tool === "line") {
    rc.line(el.x1, el.y1, el.x2, el.y2, opts);
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
  } else if (el.tool === "image" && el.src) {
    const ctx = (rc as any).canvas.getContext("2d") as CanvasRenderingContext2D;
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
    el.tool !== "highlighter"
  ) {
    const ctx = (rc as any).canvas.getContext("2d") as CanvasRenderingContext2D;
    const { x, y, w, h } = getBoundingBox(el);
    const fontSize = el.fontSize ?? el.strokeWidth * 10 + 4;
    const fontFam = el.fontFamily ?? "Kalam, cursive";
    const fontWt = el.fontWeight ?? "normal";
    ctx.save();
    ctx.font = `${fontWt} ${fontSize}px ${fontFam}`;
    ctx.fillStyle = el.strokeColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const pad = Math.max(8, fontSize * 0.5);
    const maxW = Math.max(w - pad * 2, 1);
    const lineH = fontSize * 1.5;
    const lines = wrapText(ctx, el.text, maxW);
    const totalH = lines.length * lineH;
    const startY = y + h / 2 - totalH / 2 + lineH / 2;
    lines.forEach((line, i) =>
      ctx.fillText(line, x + w / 2, startY + i * lineH),
    );

    ctx.restore();
  }
}

export function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  el: SketchElement,
  zoom = 1,
) {
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
