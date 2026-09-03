import { describe, expect, test } from "bun:test";
import type { SketchElement } from "@repo/element";
import {
  CANVAS_CLIPBOARD_MIME,
  readCanvasClipboard,
  writeCanvasClipboard,
} from "./canvasClipboard";

class MemoryClipboard {
  private readonly values = new Map<string, string>();

  getData(type: string) {
    return this.values.get(type) ?? "";
  }

  setData(type: string, value: string) {
    this.values.set(type, value);
  }
}

function makeElement(): SketchElement {
  return {
    id: "element",
    tool: "rectangle",
    x1: 0,
    y1: 0,
    x2: 100,
    y2: 50,
    seed: 1,
    strokeColor: "#000000",
    fillColor: "none",
    fillStyle: "none",
    strokeWidth: 2,
  };
}

function asDataTransfer(clipboard: MemoryClipboard): DataTransfer {
  return clipboard as unknown as DataTransfer;
}

describe("canvas clipboard", () => {
  test("round-trips a valid element payload", () => {
    const clipboard = new MemoryClipboard();
    const element = makeElement();

    expect(writeCanvasClipboard(asDataTransfer(clipboard), [element])).toBe(
      true,
    );
    const result = readCanvasClipboard(asDataTransfer(clipboard));
    expect(result?.elements).toEqual([element]);
    expect(result?.fingerprint).toBe(clipboard.getData(CANVAS_CLIPBOARD_MIME));
  });

  test("does not claim empty or unavailable clipboard writes", () => {
    const clipboard = new MemoryClipboard();
    expect(writeCanvasClipboard(null, [makeElement()])).toBe(false);
    expect(writeCanvasClipboard(asDataTransfer(clipboard), [])).toBe(false);
  });

  test("returns null for missing, malformed, or incompatible data", () => {
    const clipboard = new MemoryClipboard();
    expect(readCanvasClipboard(null)).toBeNull();
    expect(readCanvasClipboard(asDataTransfer(clipboard))).toBeNull();

    clipboard.setData(CANVAS_CLIPBOARD_MIME, "not json");
    expect(readCanvasClipboard(asDataTransfer(clipboard))).toBeNull();

    clipboard.setData(
      CANVAS_CLIPBOARD_MIME,
      JSON.stringify({
        type: "sketch-forge/elements",
        version: 99,
        elements: [],
      }),
    );
    expect(readCanvasClipboard(asDataTransfer(clipboard))).toBeNull();
  });

  test("handles clipboard implementations that reject custom MIME data", () => {
    const clipboard = {
      setData() {
        throw new Error("not allowed");
      },
    } as unknown as DataTransfer;

    expect(writeCanvasClipboard(clipboard, [makeElement()])).toBe(false);
  });
});
