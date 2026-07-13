import { describe, expect, test } from "bun:test";
import { drawSmoothStrokePath, type SmoothStrokeContext } from "./inkPath";

type Command =
  | ["M", number, number]
  | ["L", number, number]
  | ["Q", number, number, number, number];

class RecordingContext implements SmoothStrokeContext {
  commands: Command[] = [];

  moveTo(x: number, y: number) {
    this.commands.push(["M", x, y]);
  }

  lineTo(x: number, y: number) {
    this.commands.push(["L", x, y]);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    this.commands.push(["Q", cpx, cpy, x, y]);
  }
}

describe("drawSmoothStrokePath", () => {
  test("keeps two-point strokes as a direct segment", () => {
    const ctx = new RecordingContext();

    drawSmoothStrokePath(ctx, [
      { x: 0, y: 0 },
      { x: 12, y: 8 },
    ]);

    expect(ctx.commands).toEqual([
      ["M", 0, 0],
      ["L", 12, 8],
    ]);
  });

  test("uses quadratic curves for multi-point ink strokes", () => {
    const ctx = new RecordingContext();

    drawSmoothStrokePath(ctx, [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 30, y: 10 },
      { x: 40, y: 0 },
    ]);

    expect(ctx.commands).toEqual([
      ["M", 0, 0],
      ["Q", 10, 10, 20, 10],
      ["Q", 30, 10, 35, 5],
      ["L", 40, 0],
    ]);
  });
});
