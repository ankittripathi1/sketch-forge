import type { SketchElement } from "@repo/element";
import {
  readCanvasClipboard,
  writeCanvasClipboard,
} from "../utils/canvasClipboard";

export class CanvasClipboardService {
  write(
    clipboardData: DataTransfer | null,
    elements: SketchElement[],
  ): boolean {
    return writeCanvasClipboard(clipboardData, elements);
  }

  read(clipboardData: DataTransfer | null) {
    return readCanvasClipboard(clipboardData);
  }
}
