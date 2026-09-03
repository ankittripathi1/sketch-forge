import { describe, expect, test } from "bun:test";
import {
  getAllAnchorPoints,
  getAnchorPoint,
  resolveArrowEndpoints,
} from "./binding";
import type { SketchElement } from "./types";

function makeElement(overrides: Partial<SketchElement> = {}): SketchElement {
  return {
    id: "shape",
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

describe("element bindings", () => {
  test("locates all four anchors on normalized bounds", () => {
    const shape = makeElement({ x1: 110, y1: 70, x2: 10, y2: 20 });

    expect(getAllAnchorPoints(shape)).toEqual([
      { side: "top", x: 60, y: 20 },
      { side: "right", x: 110, y: 45 },
      { side: "bottom", x: 60, y: 70 },
      { side: "left", x: 10, y: 45 },
    ]);
  });

  test("returns the requested anchor point", () => {
    expect(getAnchorPoint(makeElement(), "right")).toEqual({ x: 110, y: 45 });
  });

  test("resolves both bound arrow endpoints", () => {
    const start = makeElement({ id: "start" });
    const end = makeElement({ id: "end", x1: 200, x2: 300 });
    const arrow = makeElement({
      id: "arrow",
      tool: "arrow",
      x1: 0,
      y1: 0,
      x2: 400,
      y2: 400,
      startBinding: { elementId: "start", anchor: "right" },
      endBinding: { elementId: "end", anchor: "left" },
    });

    expect(resolveArrowEndpoints(arrow, [start, end, arrow])).toEqual({
      x1: 110,
      y1: 45,
      x2: 200,
      y2: 45,
    });
  });

  test("keeps literal coordinates when a binding target is missing", () => {
    const arrow = makeElement({
      tool: "arrow",
      x1: 1,
      y1: 2,
      x2: 3,
      y2: 4,
      startBinding: { elementId: "missing", anchor: "top" },
    });

    expect(resolveArrowEndpoints(arrow, [arrow])).toEqual({
      x1: 1,
      y1: 2,
      x2: 3,
      y2: 4,
    });
  });

  test("does not reinterpret bindings on non-arrow elements", () => {
    const shape = makeElement({
      startBinding: { elementId: "another", anchor: "top" },
    });

    expect(resolveArrowEndpoints(shape, [])).toEqual({
      x1: 10,
      y1: 20,
      x2: 110,
      y2: 70,
    });
  });
});
