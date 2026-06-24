import type { SketchElement } from "@repo/element";
import { SketchForgeClipboardSchema } from "@repo/schema/canvas";

export const CANVAS_CLIPBOARD_MIME =
  "application/vnd.sketch-forge.elements+json";

type ClipboardReadResult = {
  elements: SketchElement[];
  fingerprint: string;
};

export function writeCanvasClipboard(
  clipboardData: DataTransfer | null,
  elements: SketchElement[],
): boolean {
  if (!clipboardData || elements.length === 0) {
    return false;
  }

  const serialized = JSON.stringify({
    type: "sketch-forge/elements",
    version: 1,
    elements,
  });

  try {
    clipboardData.setData(CANVAS_CLIPBOARD_MIME, serialized);

    return true;
  } catch {
    return false;
  }
}

export function readCanvasClipboard(
  clipboardData: DataTransfer | null,
): ClipboardReadResult | null {
  if (!clipboardData) return null;

  const serialized = clipboardData.getData(CANVAS_CLIPBOARD_MIME);

  if (!serialized) return null;

  try {
    const parsed: unknown = JSON.parse(serialized);

    const result = SketchForgeClipboardSchema.safeParse(parsed);

    if (!result.success) return null;

    return {
      elements: result.data.elements,
      fingerprint: serialized,
    };
  } catch {
    return null;
  }
}
