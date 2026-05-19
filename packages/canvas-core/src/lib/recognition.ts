import { Point } from "../types";
import Tesseract from "tesseract.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Which OCR backend to use. Persisted to localStorage via Settings. */
export type RecognitionBackend = "tesseract" | "gemini";

export interface RecognitionConfig {
  backend: RecognitionBackend;
  /** Required when backend is "gemini". */
  apiKey?: string;
}

// ─── Debounce ─────────────────────────────────────────────────────────────────

// Tesseract needs a longer window so multi-stroke words aren't split into
// per-letter batches. Gemini is accurate even on partial words, so 900 ms is fine.
export const DEBOUNCE_GEMINI = 900;
export const DEBOUNCE_TESSERACT = 1600;

/** Returns the debounce duration (ms) appropriate for the given backend. */
export function debounceForBackend(b: RecognitionBackend): number {
  return b === "gemini" ? DEBOUNCE_GEMINI : DEBOUNCE_TESSERACT;
}

// ─── Tesseract worker ─────────────────────────────────────────────────────────

// Lazy singleton — worker initialisation (~300 ms) is deferred to first use.
let _worker: Tesseract.Worker | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (!_worker) {
    // OEM 1 = LSTM-only engine. PSM.AUTO handles both single chars and lines.
    // NOTE: PSM.AUTO_OSD (1) was used previously but requires osd.traineddata
    // which is not bundled by tesseract.js — it returned empty strings silently.
    _worker = await Tesseract.createWorker("eng", 1, { logger: () => {} });
    await _worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO });
  }
  return _worker;
}

// ─── Image renderer ───────────────────────────────────────────────────────────

const PAD = 48;

/**
 * Returns canvas dimensions matched to the content's aspect ratio.
 *
 * A fixed-size canvas causes narrow letters to fill only ~10% of the width,
 * which breaks Tesseract. Matching the canvas shape to the stroke shape keeps
 * content filling at least ~40% of both dimensions.
 */
function canvasSize(
  srcW: number,
  srcH: number,
  backend: RecognitionBackend,
): { w: number; h: number } {
  if (backend === "gemini") return { w: 1600, h: 400 };
  const aspect = srcW / srcH;
  if (aspect < 0.6) return { w: 480, h: 560 }; // tall single letter
  if (aspect < 1.5) return { w: 600, h: 520 }; // roughly square letter
  if (aspect < 4) return { w: 1000, h: 420 }; // short word
  return { w: 1600, h: 380 }; // long word / sentence
}

/**
 * Renders all strokes onto one white bitmap, normalised to a shared bounding box.
 *
 * Uses Catmull-Rom → quadratic Bézier smoothing so the result looks like
 * natural handwriting rather than jagged polylines.
 */
function renderStrokesImage(
  strokes: Point[][],
  backend: RecognitionBackend = "tesseract",
): HTMLCanvasElement {
  const all = strokes.flat();
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));

  const srcW = maxX - minX || 1; // guard against zero-size (single dot)
  const srcH = maxY - minY || 1;

  const { w: IMG_W, h: IMG_H } = canvasSize(srcW, srcH, backend);
  const canvas = document.createElement("canvas");
  canvas.width = IMG_W;
  canvas.height = IMG_H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, IMG_W, IMG_H);
  if (!all.length) return canvas;

  const drawW = IMG_W - PAD * 2;
  const drawH = IMG_H - PAD * 2;
  const scale = Math.min(drawW / srcW, drawH / srcH);
  const ox = PAD + (drawW - srcW * scale) / 2;
  const oy = PAD + (drawH - srcH * scale) / 2;
  const tx = (p: Point) => ({
    x: (p.x - minX) * scale + ox,
    y: (p.y - minY) * scale + oy,
  });

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.min(Math.max(IMG_W * 0.007, 3), 12);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    if (stroke.length < 2) continue;
    const pts = stroke.map(tx);
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    if (pts.length === 2) {
      ctx.lineTo(pts[1]!.x, pts[1]!.y);
    } else {
      // Catmull-Rom → quadratic Bézier: draw through the midpoint between
      // each pair of consecutive control points for smooth curves.
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i]!.x + pts[i + 1]!.x) / 2;
        const my = (pts[i]!.y + pts[i + 1]!.y) / 2;
        ctx.quadraticCurveTo(pts[i]!.x, pts[i]!.y, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1]!.x, pts[pts.length - 1]!.y);
    }
    ctx.stroke();
  }

  return canvas;
}

// ─── Backends ─────────────────────────────────────────────────────────────────

const GEMINI_PROMPT =
  "This image contains handwriting on a plain white background. " +
  "Transcribe exactly what is written. " +
  "Reply with ONLY the transcribed text — no explanation, no quotes, " +
  "no surrounding punctuation unless it was actually written. " +
  "If nothing legible is present, reply with an empty string.";

/** @throws On HTTP errors. Caller is responsible for catching. */
async function recognizeWithGemini(
  canvas: HTMLCanvasElement,
  apiKey: string,
): Promise<string> {
  const base64 = canvas.toDataURL("image/png").split(",")[1]!;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType: "image/png", data: base64 } },
              { text: GEMINI_PROMPT },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

async function recognizeWithTesseract(
  canvas: HTMLCanvasElement,
): Promise<string> {
  const w = await getWorker();
  const { data } = await w.recognize(canvas);
  return data.text.trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Recognises one or more handwritten ink strokes and returns the transcribed text.
 *
 * All strokes are rendered into a single image before recognition so that
 * multi-stroke words are seen as a whole rather than isolated letters.
 *
 * @param strokes - One array of Points per ink stroke. Strokes with fewer than
 *                  3 points are dropped as noise.
 * @param config  - Backend selection and optional Gemini API key.
 * @returns The recognised text, or "" on failure or empty input.
 */
export async function recognizeHandwriting(
  strokes: Point[][],
  config: RecognitionConfig = { backend: "tesseract" },
): Promise<string> {
  const valid = strokes.filter((s) => s.length >= 3);
  if (!valid.length) return "";
  try {
    const img = renderStrokesImage(valid, config.backend);
    if (config.backend === "gemini" && config.apiKey?.trim()) {
      return await recognizeWithGemini(img, config.apiKey.trim());
    }
    return await recognizeWithTesseract(img);
  } catch (err) {
    console.error("[scribble] recognition failed:", err);
    return "";
  }
}

/**
 * @deprecated Use `recognizeHandwriting` with an array of strokes instead.
 */
export async function recognizeStrokes(
  points: Point[] | undefined,
): Promise<string> {
  if (!points) return "";
  return recognizeHandwriting([points]);
}
