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
  /** Source element id for an arrow start (parent of the connection). */
  startElementId?: string;
  /** Target element id for an arrow end (child of the connection). */
  endElementId?: string;
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
    startElementId: el.startBinding?.elementId,
    endElementId: el.endBinding?.elementId,
  };
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a whiteboard layout assistant. Rearrange the given canvas elements into a clean, well-organized layout and return ONLY a valid JSON array — no markdown, no explanation.

STEP 1 — CLASSIFY THE CANVAS:

Look at the input. Decide which mode best fits:

A) DIAGRAM / MIND-MAP / FLOWCHART
   Trigger: most labeled elements are shapes (rectangle, ellipse, diamond) containing short text,
   OR arrows/lines connect labeled shapes, OR the layout is clearly spatial (nodes scattered,
   not stacked into paragraphs).

B) NOTES / DOCUMENT
   Trigger: most elements are bare text (tool === "text") with sentence-like content arranged
   top-to-bottom like a written page.

C) MIXED — apply DIAGRAM rules to the labeled shapes and NOTES rules to bare text blocks,
   placing the text section above the diagram.

STEP 2 — INFER RELATIONSHIPS FROM THE INPUT POSITIONS:

The input x1/y1/x2/y2 tell you what the user intended:
- Elements close together → likely siblings or parent/child in a group
- Element directly above another → likely a parent or heading
- Elements in a horizontal row → likely siblings at the same level
- Arrows (tool === "arrow") with startBinding/endBinding define explicit parent → child links;
  preserve these connections — DO NOT change arrow endpoints, only reposition shapes so the
  arrow makes geometric sense (parent above/left of child).

STEP 3 — APPLY THE LAYOUT FOR THE CHOSEN MODE:

═══ DIAGRAM MODE ═══
Goal: a clean hierarchical tree or a tidy grid that preserves the spatial relationships.

- Identify the root(s): topmost element(s) with no incoming arrow / nothing above them.
- Build levels: row 0 = roots, row 1 = direct children (those pointed to by an arrow from row 0,
  or those originally placed below a row-0 element), etc.
- Render top-to-bottom, level by level. Vertical gap between levels: 80px.
- Within a level, place siblings left-to-right, centered horizontally around their parent.
  Horizontal gap between siblings: 40px.
- All shapes in the same level get the SAME height. Width = enough to hold the text + 24px padding.
- Keep all original shape dimensions PROPORTIONAL but uniform per level (snap level heights so the
  layout looks tidy).
- Start the root row at y=80. Center the entire diagram horizontally around x=480.
- DO NOT collapse shapes into a single column. DO NOT change shape "tool" types.
- For shapes: x2 = x1 + width, y2 = y1 + height.
- For text inside a shape: keep the text field unchanged.

═══ NOTES MODE ═══
- Start content at x=60, y=60. Maximum content width: 860px.
- Classify each bare text element by content:
    title      → fontSize 30, fontWeight "bold",  full 860px width row
    heading    → fontSize 22, fontWeight "bold",  full 860px width row
    subheading → fontSize 17, fontWeight "bold",  full 860px width row
    body/note  → fontSize 15, fontWeight "normal", full 860px width row
    bullet     → fontSize 14, fontWeight "normal", x indented +24px from body
- Gap between items in the same section: 12px. Between sections: 36px.
- y2 for text = y1 + fontSize * 1.4 (single line) or estimate multi-line height.
- Only include "fontSize" / "fontWeight" / "text" keys for tool === "text" elements.

═══ MIXED MODE ═══
Place notes block first (top), then diagram block underneath with a 60px gap.

UNIVERSAL RULES:
- Every input element id MUST appear in the output exactly once.
- NEVER change an element's "tool" type.
- For arrows: do NOT include x1/y1/x2/y2 in the output (they're derived from bindings). If an
  arrow has no binding, leave its coordinates equal to the input.
- Keep all original text content unchanged unless the input has obvious typos that hurt
  readability (then fix minimally).

OUTPUT: JSON array where each object has:
{ "id": string,
  "x1": number, "y1": number, "x2": number, "y2": number,
  "fontSize": number (text-tool only, optional),
  "fontWeight": "normal"|"bold" (text-tool only, optional),
  "text": string (text-tool only, optional) }`;

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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
          // Bumped from 8192 — Gemini 2.5 Flash spends a chunk of the budget
          // on internal reasoning before emitting JSON, which truncated the
          // output on larger canvases.
          maxOutputTokens: 32768,
          responseMimeType: "application/json",
          // Disable extended thinking; the layout task is straightforward
          // and reasoning tokens just eat into the output budget.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
  };
  const candidate = data.candidates?.[0];
  const rawText = candidate?.content?.parts?.[0]?.text?.trim() ?? "";

  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new Error(
      "Canvas is too large for Beautify — Gemini ran out of output tokens. Try selecting a smaller portion or simplifying the canvas.",
    );
  }

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
