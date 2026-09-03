import { describe, expect, test } from "bun:test";
import type { SketchElement } from "@repo/element/types";
import { getContextualPasteTranslation } from "./pastePlacement";

function makeElement(overrides: Partial<SketchElement> = {}): SketchElement {
  return {
    id: "element",
    tool: "rectangle",
    x1: 10,
    y1: 20,
    x2: 110,
    y2: 70,
    seed: 1,
    strokeColor: "#000",
    fillColor: "none",
    fillStyle: "none",
    strokeWidth: 2,
    ...overrides,
  };
}

describe("getContextualPasteTranslation", () => {
  const copied = [makeElement()];

  test("returns no translation for an empty clipboard", () => {
    expect(
      getContextualPasteTranslation([], {
        selectedElements: [],
        pointer: { x: 100, y: 100 },
        viewport: null,
      }),
    ).toEqual({ x: 0, y: 0 });
  });

  test("places pasted elements after the current selection", () => {
    const selected = makeElement({ x1: 200, y1: 300, x2: 260, y2: 340 });

    expect(
      getContextualPasteTranslation(copied, {
        selectedElements: [selected],
        pointer: { x: 999, y: 999 },
        viewport: null,
      }),
    ).toEqual({ x: 214, y: 304 });
  });

  test("supports a custom selection offset", () => {
    const selected = makeElement({ x1: 50, y1: 60, x2: 80, y2: 90 });

    expect(
      getContextualPasteTranslation(copied, {
        selectedElements: [selected],
        pointer: null,
        viewport: null,
        selectionOffset: 10,
      }),
    ).toEqual({ x: 50, y: 50 });
  });

  test("centers the copied bounds under the pointer", () => {
    expect(
      getContextualPasteTranslation(copied, {
        selectedElements: [],
        pointer: { x: 400, y: 300 },
        viewport: null,
      }),
    ).toEqual({ x: 340, y: 255 });
  });

  test("falls back to the viewport center and then to no translation", () => {
    expect(
      getContextualPasteTranslation(copied, {
        selectedElements: [],
        pointer: null,
        viewport: { x: 100, y: 50, width: 800, height: 600 },
      }),
    ).toEqual({ x: 440, y: 305 });

    expect(
      getContextualPasteTranslation(copied, {
        selectedElements: [],
        pointer: null,
        viewport: null,
      }),
    ).toEqual({ x: 0, y: 0 });
  });
});
