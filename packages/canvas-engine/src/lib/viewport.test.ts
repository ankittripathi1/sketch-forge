import { describe, expect, test } from "bun:test";
import { screenToCanvas } from "@repo/math";
import {
  panByOffset,
  panByPointerMove,
  zoomAroundScreenPoint,
} from "./viewport";

describe("viewport math", () => {
  test("pans by a direct offset without mutating the input", () => {
    const original = { x: 10, y: -5 };
    expect(panByOffset(original, 4, 9)).toEqual({ x: 14, y: 4 });
    expect(original).toEqual({ x: 10, y: -5 });
  });

  test("derives pan movement from consecutive pointer positions", () => {
    expect(
      panByPointerMove({ x: 20, y: 30 }, { x: 100, y: 80 }, { x: 125, y: 50 }),
    ).toEqual({ x: 45, y: 0 });
  });

  test("keeps the canvas point under the cursor fixed while zooming", () => {
    const cursor = { x: 300, y: 220 };
    const before = screenToCanvas(cursor, 1.5, { x: 40, y: -10 });
    const result = zoomAroundScreenPoint({
      currentZoom: 1.5,
      panOffset: { x: 40, y: -10 },
      cursorScreen: cursor,
      delta: 0.25,
      minZoom: 0.5,
      maxZoom: 4,
    });
    const after = screenToCanvas(cursor, result.zoom, result.panOffset);

    expect(result.zoom).toBe(1.875);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  test("clamps zoom to configured minimum and maximum values", () => {
    const base = {
      currentZoom: 1,
      panOffset: { x: 0, y: 0 },
      cursorScreen: { x: 50, y: 50 },
      minZoom: 0.5,
      maxZoom: 2,
    };

    expect(zoomAroundScreenPoint({ ...base, delta: -0.9 }).zoom).toBe(0.5);
    expect(zoomAroundScreenPoint({ ...base, delta: 5 }).zoom).toBe(2);
  });
});
