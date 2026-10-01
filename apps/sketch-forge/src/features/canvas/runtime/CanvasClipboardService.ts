import type { ReadonlyElement } from "@repo/canvas-engine";
import {
  readCanvasClipboard,
  writeCanvasClipboard,
} from "../utils/canvasClipboard";

export class CanvasClipboardService {
  write(
    clipboardData: DataTransfer | null,
    elements: readonly ReadonlyElement[],
  ): boolean {
    return writeCanvasClipboard(clipboardData, elements);
  }

  read(clipboardData: DataTransfer | null) {
    return readCanvasClipboard(clipboardData);
  }
}
