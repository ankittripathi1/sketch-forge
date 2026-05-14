import { SketchElement } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Position and optional style updates returned by Gemini for one element. */
export interface LayoutUpdate {
  /** Must match an existing SketchElement id. Unknown ids are discarded. */
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Only populated for tool="text" elements. */
  text?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  strokeColor?: string;
}

// ─── Serialisation ────────────────────────────────────────────────────────────

/** Minimal element representation sent to the model. Internal fields are omitted. */
interface ElementSnapshot {
  id: string;
  tool: string;
  text?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number; // |x2 - x1|
  h: number; // |y2 - y1|
  fontSize?: number;
  fontWeight?: string;
}

function snapshot(el: SketchElement): ElementSnapshot {
  return {
    id: el.id,
    tool: el.tool,
    text: el.text,
    x1: Math.round(el.x1),
    y1: Math.round(el.y1),
    x2: Math.round(el.x2),
    y2: Math.round(el.y2),
    w: Math.round(Math.abs(el.x2 - el.x1)),
    h: Math.round(Math.abs(el.y2 - el.y1)),
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
  };
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a whiteboard layout assistant. Rearrange the given canvas elements into a clean, beautiful notes layout and return ONLY a valid JSON array — no markdown, no explanation.

LAYOUT RULES:
- Start content at x=60, y=60. Maximum content width: 860px.
- Identify the role of each text element from its content:
    title      → fontSize 30, fontWeight "bold",  full 860px width row
    heading    → fontSize 22, fontWeight "bold",  full 860px width row
    subheading → fontSize 17, fontWeight "bold",  full 860px width row
    body/note  → fontSize 15, fontWeight "normal", full 860px width row
    bullet     → fontSize 14, fontWeight "normal", x indented +24px from body
- Gap between items in the same section: 12px
- Gap between sections: 36px
- Shapes (rectangle, ellipse, line): place in a horizontal row below related text, or at bottom. Keep original aspect ratio.
- Images: place in a row below text content, keep aspect ratio.
- For non-text elements: set x2 = x1 + original_w, y2 = y1 + original_h.
- Every input element id must appear in output.
- y2 for text elements = y1 + fontSize * 1.4 (single line) or estimate multi-line height.

OUTPUT: JSON array where each object has:
{ "id": string, "x1": number, "y1": number, "x2": number, "y2": number,
  "fontSize": number (text only), "fontWeight": "normal"|"bold" (text only),
  "text": string (text only, cleaned/trimmed, preserve original wording) }

Only include "fontSize", "fontWeight", "text" keys for text-type elements (tool === "text").`;

// ─── API call ─────────────────────────────────────────────────────────────────

/**
 * Sends all canvas elements to Gemini 2.0 Flash and returns a layout plan.
 *
 * Uses a multi-turn conversation so the model acknowledges the instructions
 * before receiving the data. `responseMimeType: "application/json"` forces
 * valid JSON output; the fence-stripping below is a fallback for older models.
 *
 * @param elements - All SketchElements on the canvas.
 * @param apiKey   - Google Generative AI API key.
 * @returns Array of LayoutUpdates keyed by element id. Returns [] for empty canvas.
 * @throws On network error or unparseable model response.
 */
export async function getAILayout(
  elements: SketchElement[],
  apiKey: string,
): Promise<LayoutUpdate[]> {
  if (!elements.length) return [];

  const userMessage = `INPUT ELEMENTS:\n${JSON.stringify(elements.map(snapshot), null, 2)}\n\nReturn the layout JSON array:`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
          {
            role: "model",
            parts: [{ text: "Understood. Send me the elements." }],
          },
          { role: "user", parts: [{ text: userMessage }] },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  // Strip markdown fences — some model versions still include them despite
  // responseMimeType: "application/json".
  const jsonStr = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`AI returned invalid JSON: ${jsonStr.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed))
    throw new Error("AI response was not a JSON array");

  // Discard entries with unknown ids or missing coordinate fields.
  const knownIds = new Set(elements.map((e) => e.id));
  return (parsed as LayoutUpdate[]).filter(
    (u) =>
      typeof u.id === "string" &&
      knownIds.has(u.id) &&
      typeof u.x1 === "number" &&
      typeof u.y1 === "number" &&
      typeof u.x2 === "number" &&
      typeof u.y2 === "number",
  );
}
