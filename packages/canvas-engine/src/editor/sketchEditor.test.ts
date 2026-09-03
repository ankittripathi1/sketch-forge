import { describe, expect, test } from "bun:test";
import type { SketchElement } from "@repo/element/types";
import { createSketchEditor } from "./sketchEditor";
import { createNullSurface } from "./surface";

function makeElement(overrides: Partial<SketchElement> = {}): SketchElement {
  return {
    id: "element",
    tool: "rectangle",
    x1: 0,
    y1: 0,
    x2: 100,
    y2: 50,
    seed: 1,
    strokeColor: "#000",
    fillColor: "none",
    fillStyle: "none",
    strokeWidth: 2,
    ...overrides,
  };
}

describe("editor construction", () => {
  test("builds with no React and no DOM", () => {
    const editor = createSketchEditor({ surface: createNullSurface() });

    expect(editor.getState().activeTool).toBe("rectangle");
    expect(editor.getElements()).toEqual([]);
    expect(editor.surface.scene()).toBeNull();
  });

  test("each editor gets its own state", () => {
    const first = createSketchEditor();
    const second = createSketchEditor();

    first.setActiveTool("ellipse");

    expect(first.getState().activeTool).toBe("ellipse");
    expect(second.getState().activeTool).toBe("rectangle");
  });

  test("recognition settings can be seeded and then changed", () => {
    const editor = createSketchEditor({ settings: { scribbleEnabled: true } });

    expect(editor.getState().scribbleEnabled).toBe(true);
    expect(editor.getState().recognitionBackend).toBe("tesseract");

    editor.setRecognitionApiKey("key");
    expect(editor.getState().recognitionApiKey).toBe("key");
  });
});

describe("tool transitions", () => {
  test("switching to the highlighter takes its style, and back restores it", () => {
    const editor = createSketchEditor();
    const original = editor.getState().currentItemStyle.strokeColor;

    editor.setActiveTool("highlighter");
    expect(editor.getState().currentItemStyle.strokeColor).toBe("#f2d14f");
    expect(editor.getState().currentItemStyle.strokeWidth).toBe(18);

    editor.setActiveTool("rectangle");
    expect(editor.getState().currentItemStyle.strokeColor).toBe(original);
    expect(editor.getState().currentItemStyle.strokeWidth).toBe(1.5);
  });

  test("the highlighter returns to the dark stroke in a dark theme", () => {
    const editor = createSketchEditor({ theme: "dark" });

    editor.setActiveTool("highlighter");
    editor.setActiveTool("rectangle");

    expect(editor.getState().currentItemStyle.strokeColor).toBe("#e8e6d8");
  });

  test("changing tool drops the selection", () => {
    const editor = createSketchEditor();
    editor.commitCreatedElement(makeElement());
    expect(editor.getState().selectedElementIds.size).toBe(1);

    editor.setActiveTool("ellipse");

    expect(editor.getState().selectedElementIds.size).toBe(0);
    expect(editor.getState().selectedTool).toBeNull();
  });
});

describe("style transitions", () => {
  test("style with nothing selected updates the toolbar only", () => {
    const editor = createSketchEditor();

    editor.setStyle({ strokeColor: "#ff0000" });

    expect(editor.getState().currentItemStyle.strokeColor).toBe("#ff0000");
    expect(editor.getState().canUndo).toBe(false);
  });

  test("style with a selection updates the elements and captures history", () => {
    const editor = createSketchEditor();
    editor.commitCreatedElement(makeElement({ id: "shape" }));

    editor.setStyle({ strokeColor: "#00ff00" });

    expect(editor.getElements()[0]!.strokeColor).toBe("#00ff00");
    expect(editor.getState().currentItemStyle.strokeColor).toBe("#00ff00");
  });
});

describe("history transitions", () => {
  test("creating an element makes undo available", () => {
    const editor = createSketchEditor();
    expect(editor.getState().canUndo).toBe(false);

    editor.commitCreatedElement(makeElement());

    expect(editor.getState().canUndo).toBe(true);
    expect(editor.getState().canRedo).toBe(false);
  });

  test("undo restores the previous scene and redo puts it back", () => {
    const editor = createSketchEditor();
    editor.commitCreatedElement(makeElement({ id: "first" }));
    editor.commitCreatedElement(makeElement({ id: "second" }));
    expect(editor.getElements()).toHaveLength(2);

    editor.undo();
    expect(editor.getElements().map((el) => el.id)).toEqual(["first"]);
    expect(editor.getState().canRedo).toBe(true);

    editor.redo();
    expect(editor.getElements().map((el) => el.id)).toEqual([
      "first",
      "second",
    ]);
    expect(editor.getState().canRedo).toBe(false);
  });

  test("undo on an empty history changes nothing", () => {
    const editor = createSketchEditor();

    expect(editor.undo()).toBe(false);
    expect(editor.getElements()).toEqual([]);
    expect(editor.getState().canUndo).toBe(false);
  });

  test("onChange fires for a commit and for an undo", () => {
    let changes = 0;
    const editor = createSketchEditor({ onChange: () => changes++ });

    editor.commitCreatedElement(makeElement());
    expect(changes).toBe(1);

    editor.undo();
    expect(changes).toBe(2);
  });
});

describe("store subscription", () => {
  test("notifies subscribers when view state changes", () => {
    const editor = createSketchEditor();
    const seen: string[] = [];
    const unsubscribe = editor.store.subscribe((state) =>
      seen.push(state.activeTool),
    );

    editor.setActiveTool("ellipse");
    editor.setActiveTool("text");
    unsubscribe();
    editor.setActiveTool("rectangle");

    expect(seen).toEqual(["ellipse", "text"]);
  });

  test("scene changes do not notify subscribers on their own", () => {
    const editor = createSketchEditor();
    let notifications = 0;
    editor.store.subscribe(() => notifications++);

    editor.setSceneElements([makeElement()]);

    expect(notifications).toBe(0);
    expect(editor.getElements()).toHaveLength(1);
  });
});
