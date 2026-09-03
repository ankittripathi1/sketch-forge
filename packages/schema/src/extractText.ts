import { SketchElement } from "./canvas.js";

/**
 * Reduces a Markdown note to plain text for the search index: markers
 * (headings, emphasis, list bullets, code fences) are dropped, link text is
 * kept, URLs are not.
 */
function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[^\n]*/g, " ") // code fence lines
    .replace(/!?\[([^\]]*)\]\(([^)]*)\)/g, "$1") // links & images → text
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // heading markers
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s*)?/gm, "") // list/task markers
    .replace(/^\s*>\s?/gm, "") // blockquote markers
    .replace(/[*_~`]+/g, " "); // emphasis / inline code
}

/**
 * Extracts all searchable text from a page: text from "text" elements plus
 * the page note (Markdown, stripped to plain text), with whitespace
 * normalized.
 */
export function extractSearchableText(
  elements: SketchElement[],
  note?: string | null,
): string {
  const textParts =
    elements && Array.isArray(elements)
      ? elements
          .filter((el) => el.text && (el as any).tool === "text")
          .map((el) => el.text!.trim())
      : [];

  if (note) {
    textParts.push(markdownToPlainText(note));
  }

  // Join with spaces and normalize whitespace
  return textParts.join(" ").replace(/\s+/g, " ").trim();
}
