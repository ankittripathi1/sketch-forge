import { describe, expect, test } from "bun:test";
import { canvasToScreen, screenToCanvas } from "./coords";

describe("screenToCanvas", () => {
  test("invertes pand than zoom", () => {
    expect(screenToCanvas({ x: 120, y: 80 }, 2, { x: 20, y: 10 })).toEqual({
      x: 50,
      y: 35,
    })
  })

  test("is identity at zoom 1 with no pan", () => {
    expect(screenToCanvas({ x: 7, y: -3 }, 1, { x: 0, y: 0 })).toEqual({
      x: 7,
      y:-3,
    })
  })
});

describe("canvasToScreen / screenToCanvas round-Trip", () => {
  const zoom = 1.5;
  const pan = { x: 33, y: -12 };
  test("canvasToScreen undeos screenToCanvas", () => {
    const screen = { x: 200, y: 140 };
    const back = canvasToScreen(screenToCanvas(screen, zoom, pan), zoom, pan);
    expect(back.x).toBeCloseTo(screen.x);
    expect(back.y).toBeCloseTo(screen.y);
  })
})
