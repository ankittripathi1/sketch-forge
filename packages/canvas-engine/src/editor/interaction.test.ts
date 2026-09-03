import { beforeEach, describe, expect, test } from "bun:test";
import type { Point } from "@repo/element/types";
import { createSketchEditor, type SketchEditor } from "./sketchEditor";
import {
  startDrawing,
  finalizeDrawingInteraction,
  handleDrawingPointerMove,
} from "../tools/drawingController";
import {
  finalizeSelectInteraction,
  handleSelectPointerDown,
  handleSelectPointerMove,
} from "../tools/selectController";
import { panViewport, zoomViewport } from "../lib/viewportController";

/**
 * These replay whole pointer gestures against the editor. Before the editor
 * owned interaction state this was unreachable from a test: the state lived in
 * React refs and the controllers needed a canvas.
 */

// The controllers schedule paints through requestAnimationFrame. Nothing here
// paints, so run the callback immediately and let the assertions see the result.
globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
  cb(0);
  return 0;
}) as typeof requestAnimationFrame;
globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;

/** Drags from `from` to `to` with the given tool, as a real gesture would. */
function drawShape(editor: SketchEditor, from: Point, to: Point) {
  startDrawing(editor, from);
  handleDrawingPointerMove(editor, to);
  finalizeDrawingInteraction(editor);
}

describe("drawing a shape", () => {
  let editor: SketchEditor;
  beforeEach(() => {
    editor = createSketchEditor();
  });

  test("down, move, up produces one committed element", () => {
    editor.setActiveTool("rectangle");
    drawShape(editor, { x: 10, y: 10 }, { x: 110, y: 60 });

    const elements = editor.getElements();
    expect(elements).toHaveLength(1);
    expect(elements[0]!.tool).toBe("rectangle");
    expect(editor.frame.currentElement).toBeNull();
    expect(editor.frame.canvasInteraction.type).toBe("idle");
  });

  test("the committed element is selected and history records it", () => {
    editor.setActiveTool("rectangle");
    drawShape(editor, { x: 0, y: 0 }, { x: 50, y: 50 });

    const id = editor.getElements()[0]!.id;
    expect([...editor.getState().selectedElementIds]).toEqual([id]);
    expect(editor.getState().canUndo).toBe(true);
  });

  test("a drag that never moves still commits", () => {
    editor.setActiveTool("ellipse");
    startDrawing(editor, { x: 5, y: 5 });
    finalizeDrawingInteraction(editor);

    expect(editor.getElements()).toHaveLength(1);
  });

  test("the draft is not in the scene until the pointer comes up", () => {
    editor.setActiveTool("rectangle");
    startDrawing(editor, { x: 0, y: 0 });
    handleDrawingPointerMove(editor, { x: 40, y: 40 });

    expect(editor.getElements()).toHaveLength(0);
    expect(editor.frame.currentElement).not.toBeNull();
  });

  test("the eraser removes what it crosses", () => {
    editor.setActiveTool("rectangle");
    drawShape(editor, { x: 0, y: 0 }, { x: 100, y: 100 });
    expect(editor.getElements()).toHaveLength(1);

    editor.setActiveTool("eraser");
    drawShape(editor, { x: 10, y: 10 }, { x: 90, y: 90 });

    expect(editor.getElements()).toHaveLength(0);
  });
});

describe("selecting and dragging", () => {
  let editor: SketchEditor;
  beforeEach(() => {
    editor = createSketchEditor();
    editor.setActiveTool("rectangle");
    drawShape(editor, { x: 0, y: 0 }, { x: 100, y: 100 });
    // Drawing leaves the new shape selected and the tool on select, so start
    // each of these from a clean selection instead.
    editor.clearSelection();
  });

  test("clicking a shape selects it", () => {
    handleSelectPointerDown(editor, { x: 50, y: 50 }, false);
    finalizeSelectInteraction(editor);

    expect(editor.getState().selectedElementIds.size).toBe(1);
    expect(editor.getState().selectedTool).toBe("rectangle");
  });

  test("clicking empty space clears the selection", () => {
    handleSelectPointerDown(editor, { x: 50, y: 50 }, false);
    finalizeSelectInteraction(editor);
    expect(editor.getState().selectedElementIds.size).toBe(1);

    handleSelectPointerDown(editor, { x: 900, y: 900 }, false);
    finalizeSelectInteraction(editor);

    expect(editor.getState().selectedElementIds.size).toBe(0);
  });

  test("dragging a selected shape moves it and records one history entry", () => {
    handleSelectPointerDown(editor, { x: 50, y: 50 }, false);
    const before = editor.getElements()[0]!;

    handleSelectPointerMove(editor, { x: 70, y: 90 });
    finalizeSelectInteraction(editor);

    const after = editor.getElements()[0]!;
    expect(after.x1).toBe(before.x1 + 20);
    expect(after.y1).toBe(before.y1 + 40);
    expect(editor.frame.selectInteraction.type).toBe("idle");
  });

  test("undo puts a dragged shape back", () => {
    const originX = editor.getElements()[0]!.x1;

    handleSelectPointerDown(editor, { x: 50, y: 50 }, false);
    handleSelectPointerMove(editor, { x: 80, y: 50 });
    finalizeSelectInteraction(editor);
    expect(editor.getElements()[0]!.x1).not.toBe(originX);

    editor.undo();

    expect(editor.getElements()[0]!.x1).toBe(originX);
  });

  test("shift-click adds a second shape to the selection", () => {
    editor.setActiveTool("rectangle");
    drawShape(editor, { x: 200, y: 200 }, { x: 300, y: 300 });
    editor.clearSelection();

    handleSelectPointerDown(editor, { x: 50, y: 50 }, false);
    finalizeSelectInteraction(editor);
    handleSelectPointerDown(editor, { x: 250, y: 250 }, true);
    finalizeSelectInteraction(editor);

    expect(editor.getState().selectedElementIds.size).toBe(2);
  });

  test("a marquee across empty space selects what it covers", () => {
    // A marquee only starts when nothing is selected; otherwise a click on
    // empty space means "clear the selection".
    handleSelectPointerDown(editor, { x: -50, y: -50 }, false);
    expect(editor.frame.selectInteraction.type).toBe("marquee");

    handleSelectPointerMove(editor, { x: 150, y: 150 });
    expect(editor.frame.selectionMarquee).not.toBeNull();

    finalizeSelectInteraction(editor);

    expect(editor.getState().selectedElementIds.size).toBe(1);
    expect(editor.frame.selectionMarquee).toBeNull();
  });
});

describe("viewport gestures", () => {
  test("panning moves the offset without touching the scene", () => {
    const editor = createSketchEditor();
    editor.setActiveTool("rectangle");
    drawShape(editor, { x: 0, y: 0 }, { x: 10, y: 10 });
    const before = editor.getElements()[0]!.x1;

    panViewport(editor, 30, -15);

    expect(editor.frame.panOffset).toEqual({ x: 30, y: -15 });
    expect(editor.getElements()[0]!.x1).toBe(before);
  });

  test("zoom updates the live value and the display copy together", () => {
    const editor = createSketchEditor();

    // `delta` is a fraction of the current zoom: a wheel notch is about 0.1.
    zoomViewport({
      editor,
      cursorScreen: { x: 0, y: 0 },
      delta: 0.1,
      minZoom: 0.05,
      maxZoom: 20,
    });

    expect(editor.frame.zoom).toBeGreaterThan(1);
    expect(editor.getState().zoomDisplay).toBe(
      Math.round(editor.frame.zoom * 100),
    );
  });

  test("zoom is clamped", () => {
    const editor = createSketchEditor();

    for (let i = 0; i < 200; i++) {
      zoomViewport({
        editor,
        cursorScreen: { x: 0, y: 0 },
        delta: 0.1,
        minZoom: 0.05,
        maxZoom: 20,
      });
    }

    expect(editor.frame.zoom).toBe(20);
  });

  test("screen and canvas coordinates round-trip through zoom and pan", () => {
    const editor = createSketchEditor();
    panViewport(editor, 40, 25);

    const screen = { x: 120, y: 80 };
    const roundTripped = editor.canvasToScreen(editor.screenToCanvas(screen));

    expect(roundTripped.x).toBeCloseTo(screen.x);
    expect(roundTripped.y).toBeCloseTo(screen.y);
  });
});
