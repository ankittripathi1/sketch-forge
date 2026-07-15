import { describe, expect, test } from "bun:test";
import { SketchElement } from "./types";
import {
  getBoundingBox,
  getElementsBoundingBox,
  hitTestElement,
  isElementInsideRect,
} from "./bounds";

function makeElement(overrides: Partial<SketchElement> = {}): SketchElement {
  return {
    id: "el-1",
    tool: "rectangle",
    x1: 0,
    y1: 0,
    x2: 100,
    y2: 50,
    seed: 1,
    strokeColor: "#000",
    fillColor: "transparent",
    fillStyle: "none",
    strokeWidth: 2,
    ...overrides,
  };
}

describe("getBoundingBox", () => {
  test("normalize reversed corners for shapes", () => {
    const el = makeElement({ x1: 100, y1: 50, x2: 0, y2: 0 });
    expect(getBoundingBox(el)).toEqual({ x: 0, y: 0, w: 100, h: 50 });
  });

  test("usage point extent for freehand strokes", () => {
    const el = makeElement({
      tool: "freehand",
      points: [
        { x: 10, y: 10 },
        { x: 40, y: 60 },
        { x: 25, y: 5 },
      ],
    });

    expect(getBoundingBox(el)).toEqual({ x: 10, y: 5, w: 30, h: 55 });
  });
});

describe("hitTestElement", () => {
  test("hits inside a rectangle bounding box", () => {
    const el = makeElement();
    expect(hitTestElement(el, { x: 500, y: 25 })).toBe(false);
  });

  test("misses well outside the threshold", () => {
    const el = makeElement();
    expect(hitTestElement(el, { x: 500, y: 500 })).toBe(false);
  });

  test("hits near the line within threshold", () => {
    const line = makeElement({ tool: "line", x1: 0, y1: 0, x2: 100, y2: 0 });
    expect(hitTestElement(line, { x: 50, y: 3 })).toBe(true);
    expect(hitTestElement(line, { x: 50, y: 20 })).toBe(false);
  });
});

describe("isElementInsideRect", () => {
  test("true when fully enclosed", () => {
    const el = makeElement();
    expect(isElementInsideRect(el, -10, -10, 200, 200)).toBe(true);
  });

  test("false when partialy outside", () => {
    const el = makeElement();
    expect(isElementInsideRect(el, 10, 10, 200, 200)).toBe(false);
  });
});

describe("getElementsBoundingBox", () => {
  test("return zero box for no elements", () => {
    expect(getElementsBoundingBox([])).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });

  test("union multiple element boxes", () => {
    const a = makeElement({ x1: 0, y1: 0, x2: 20, y2: 20 });
    const b = makeElement({ id: "el-2", x1: 40, y1: 30, x2: 60, y2: 80 });
    expect(getElementsBoundingBox([a, b])).toEqual({
      x: 0,
      y: 0,
      w: 60,
      h: 80,
    });
  });
});
