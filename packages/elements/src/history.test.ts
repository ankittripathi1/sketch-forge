import { describe, expect, test } from "bun:test";
import { createHistory } from "./history";
import type { SketchElement } from "./types";

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

describe("createHistory", () => {
  test("starts empty with nothing to undo or redo", () => {
    const h = createHistory();
    expect(h.getCurrent()).toEqual([]);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBeNull();
  });

  test("undo returns the previous snapshot", () => {
    const h = createHistory();
    const a = [makeElement({ id: "a" })];
    const b = [makeElement({ id: "a" }), makeElement({ id: "b" })];

    h.push(a);
    h.push(b);
    expect(h.getCurrent()).toEqual(b);
    expect(h.canUndo()).toBe(true);

    expect(h.undo()).toEqual(a);
    expect(h.getCurrent()).toEqual(a);
    expect(h.canRedo()).toBe(true);
  });

  test("redo re-applies an undone snapshot", () => {
    const h = createHistory();
    const a = [makeElement({ id: "a" })];
    const b = [makeElement({ id: "b" })];

    h.push(a);
    h.push(b);
    h.undo();
    expect(h.redo()).toEqual(b);
    expect(h.getCurrent()).toEqual(b);
    expect(h.canRedo()).toBe(false);
  });

  test("pushing after an undo drops the redo branch", () => {
    const h = createHistory();
    h.push([makeElement({ id: "a" })]);
    h.push([makeElement({ id: "b" })]);
    h.undo();

    const c = [makeElement({ id: "c" })];
    h.push(c);

    expect(h.canRedo()).toBe(false);
    expect(h.redo()).toBeNull();
    expect(h.getCurrent()).toEqual(c);
  });

  test("stores a copy so later mutation does not corrupt history", () => {
    const h = createHistory();
    const snapshot = [makeElement({ id: "a" })];
    h.push(snapshot);

    snapshot.push(makeElement({ id: "mutated" }));

    expect(h.getCurrent()).toHaveLength(1);
  });
});
