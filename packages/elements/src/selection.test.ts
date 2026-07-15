import { describe, expect, test } from "bun:test";
import {
  addToSelection,
  cloneElementsForPaste,
  deleteElementsByIds,
  getSelectedElements,
  mergeElementsById,
  removeFromSelection,
  setSelection,
  toggleSelection,
  updateElementsByIds,
} from "./selection";
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

describe("selection sets", () => {
  test("setSelection builds a set from ids", () => {
    expect(setSelection(["a", "b", "a"])).toEqual(new Set(["a", "b"]));
  });

  test("addToSelection is immutable and additive", () => {
    const base = new Set(["a"]);
    const next = addToSelection(base, ["b", "c"]);
    expect(next).toEqual(new Set(["a", "b", "c"]));
    expect(base).toEqual(new Set(["a"]));
  });

  test("removeFromSelection drops the given ids", () => {
    expect(removeFromSelection(new Set(["a", "b", "c"]), ["b"])).toEqual(
      new Set(["a", "c"]),
    );
  });

  test("toggleSelection flips membership", () => {
    expect(toggleSelection(new Set(["a"]), "b")).toEqual(new Set(["a", "b"]));
    expect(toggleSelection(new Set(["a", "b"]), "b")).toEqual(new Set(["a"]));
  });
});

describe("element list operations", () => {
  const a = makeElement({ id: "a" });
  const b = makeElement({ id: "b" });
  const c = makeElement({ id: "c" });

  test("getSelectedElements filters by id set", () => {
    expect(getSelectedElements([a, b, c], new Set(["a", "c"]))).toEqual([a, c]);
  });

  test("updateElementsByIds only patches selected elements", () => {
    const result = updateElementsByIds([a, b], new Set(["b"]), {
      strokeColor: "#f00",
    });
    expect(result[0]!.strokeColor).toBe("#000");
    expect(result[1]!.strokeColor).toBe("#f00");
  });

  test("deleteElementsByIds removes selected elements", () => {
    expect(deleteElementsByIds([a, b, c], new Set(["b"]))).toEqual([a, c]);
  });

  test("mergeElementsById replaces existing and appends new", () => {
    const updatedB = makeElement({ id: "b", strokeColor: "#00f" });
    const d = makeElement({ id: "d" });
    const result = mergeElementsById([a, b], [updatedB, d]);
    expect(result).toEqual([a, updatedB, d]);
  });
});

describe("cloneElementsForPaste", () => {
  test("assigns fresh ids and offsets coordinates", () => {
    const original = makeElement({ id: "orig", x1: 0, y1: 0, x2: 10, y2: 10 });
    const [clone] = cloneElementsForPaste([original], 5);

    expect(clone!.id).not.toBe("orig");
    expect(clone!.x1).toBe(5);
    expect(clone!.y1).toBe(5);
    expect(clone!.x2).toBe(15);
    expect(clone!.y2).toBe(15);
  });

  test("remaps bindings that point inside the clone set", () => {
    const shape = makeElement({ id: "shape" });
    const arrow = makeElement({
      id: "arrow",
      tool: "arrow",
      startBinding: { elementId: "shape", anchor: "left" },
      endBinding: { elementId: "outside", anchor: "right" },
    });

    const [clonedShape, clonedArrow] = cloneElementsForPaste(
      [shape, arrow],
      { x: 0, y: 0 },
    );

    // start binding points at another cloned element → remapped to its new id
    expect(clonedArrow!.startBinding!.elementId).toBe(clonedShape!.id);
    // end binding points outside the clone set → dropped
    expect(clonedArrow!.endBinding).toBeUndefined();
  });
});
