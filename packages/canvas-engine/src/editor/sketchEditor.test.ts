import { beforeEach, describe, expect, test } from "bun:test";
import type { Point, SketchElement } from "@repo/element/types";
import { createSketchEditor, type SketchEditor } from "./sketchEditor";

// Nothing here paints, so run scheduled frames immediately.
globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
  cb(0);
  return 0;
}) as typeof requestAnimationFrame;
globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;

const click = { button: 0, shiftKey: false };

function rect(id: string, x: number): SketchElement {
  return {
    id,
    tool: "rectangle",
    x1: x,
    y1: 0,
    x2: x + 50,
    y2: 50,
    seed: 1,
    strokeColor: "#000",
    fillColor: "none",
    fillStyle: "none",
    strokeWidth: 2,
  };
}

function drag(editor: SketchEditor, from: Point, to: Point) {
  editor.pointerDown(from, click);
  editor.pointerMove(to);
  editor.pointerUp();
}

describe("read access can't change the editor", () => {
  test("the store has no write methods", () => {
    const editor = createSketchEditor();
    expect(Object.keys(editor.store).sort()).toEqual([
      "getInitialState",
      "getState",
      "subscribe",
    ]);
    expect("setState" in editor.store).toBe(false);
  });

  test("the store still notifies subscribers", () => {
    const editor = createSketchEditor();
    const seen: string[] = [];
    const unsubscribe = editor.store.subscribe((state) =>
      seen.push(state.activeTool),
    );
    editor.setTool("ellipse");
    unsubscribe();
    expect(seen).toContain("ellipse");
  });

  test("reads are typed read-only", () => {
    // Compile-time only: `bun check-types` fails if any of these compile.
    const typeChecks = (editor: SketchEditor) => {
      // @ts-expect-error the scene can't be pushed to
      editor.getElements().push(rect("x", 0));
      // @ts-expect-error shapes can't be changed in place
      editor.getElements()[0]!.x1 = 5;
      // @ts-expect-error nested view state can't be changed in place
      editor.getState().currentItemStyle.strokeColor = "red";
      // @ts-expect-error the store can't be written
      editor.store.setState({ activeTool: "ellipse" });
    };
    expect(typeof typeChecks).toBe("function");
  });
});

describe("loadScene", () => {
  let editor: SketchEditor;
  beforeEach(() => {
    editor = createSketchEditor();
  });

  test("changing the input afterwards doesn't reach the scene or undo", () => {
    const input = [rect("a", 0)];
    editor.loadScene(input);
    input[0]!.x1 = 999;
    input.push(rect("b", 100));

    expect(editor.getElements()).toHaveLength(1);
    expect(editor.getElements()[0]!.x1).toBe(0);

    editor.setTool("rectangle");
    drag(editor, { x: 200, y: 0 }, { x: 260, y: 60 });
    editor.undo();

    expect(editor.getElements()).toHaveLength(1);
    expect(editor.getElements()[0]!.x1).toBe(0);
  });

  test("load, edit, undo returns to the loaded scene and stops there", () => {
    editor.loadScene([rect("a", 0), rect("b", 100)]);
    expect(editor.getState().canUndo).toBe(false);

    editor.setTool("select");
    drag(editor, { x: 25, y: 25 }, { x: 45, y: 25 });
    expect(editor.getElements()[0]!.x1).toBe(20);

    expect(editor.undo()).toBe(true);
    expect(editor.getElements().map((el) => [el.id, el.x1])).toEqual([
      ["a", 0],
      ["b", 100],
    ]);
    expect(editor.undo()).toBe(false);
    expect(editor.getElements()).toHaveLength(2);
  });

  test("loading isn't an edit, so it doesn't fire onChange", () => {
    let changes = 0;
    const tracked = createSketchEditor({ onChange: () => changes++ });
    tracked.loadScene([rect("a", 0)]);
    expect(changes).toBe(0);
  });
});
