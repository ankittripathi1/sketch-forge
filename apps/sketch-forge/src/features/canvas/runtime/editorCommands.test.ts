import { beforeEach, describe, expect, test } from "bun:test";
import {
  createSketchEditor,
  type ReadonlyElement,
  type SketchEditor,
} from "@repo/canvas-engine";
import type { SketchElement } from "@repo/element";
import type { CanvasClipboard } from "../utils/canvasClipboard";
import {
  commandCopy,
  commandCut,
  commandPaste,
  commandRedo,
  commandStartPanning,
  commandStopPanning,
  commandUndo,
  type CanvasEditorCommandContext,
} from "./editorCommands";

// The editor schedules paints; nothing paints here, so run them right away.
globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
  cb(0);
  return 0;
}) as typeof requestAnimationFrame;
globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;

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

/** A clipboard that records writes and returns `payload` on read. */
function fakeClipboard({
  canWrite = true,
  payload = null as SketchElement[] | null,
} = {}) {
  const written: (readonly ReadonlyElement[])[] = [];
  const clipboard: CanvasClipboard = {
    write: (_data, elements) => {
      if (!canWrite) return false;
      written.push(elements);
      return true;
    },
    read: () => (payload ? { elements: payload, fingerprint: "x" } : null),
  };
  return { clipboard, written };
}

/** An editor with two shapes loaded and the first one selected. */
function editorWithSelection(): SketchEditor {
  const editor = createSketchEditor();
  editor.loadScene([rect("a", 0), rect("b", 100)]);
  editor.setTool("select");
  editor.pointerDown({ x: 25, y: 25 }, { button: 0, shiftKey: false });
  editor.pointerUp();
  return editor;
}

describe("clipboard commands", () => {
  let editor: SketchEditor;
  beforeEach(() => {
    editor = editorWithSelection();
  });

  test("copy writes the selection and reports success", () => {
    const { clipboard, written } = fakeClipboard();
    const context: CanvasEditorCommandContext = { editor, clipboard };

    expect(commandCopy.perform(context, { clipboardData: null })).toEqual({
      handled: true,
    });
    expect(written[0]!.map((el) => el.id)).toEqual(["a"]);
  });

  test("cut deletes only after a successful clipboard write", () => {
    const failing = fakeClipboard({ canWrite: false });
    expect(
      commandCut.perform(
        { editor, clipboard: failing.clipboard },
        { clipboardData: null },
      ),
    ).toEqual({ handled: false });
    expect(editor.getElements()).toHaveLength(2);

    const working = fakeClipboard();
    commandCut.perform(
      { editor, clipboard: working.clipboard },
      { clipboardData: null },
    );
    expect(editor.getElements().map((el) => el.id)).toEqual(["b"]);
  });

  test("paste inserts copies of the clipboard elements", () => {
    const { clipboard } = fakeClipboard({ payload: [rect("copied", 0)] });

    expect(
      commandPaste.perform({ editor, clipboard }, { clipboardData: null }),
    ).toEqual({ handled: true });
    expect(editor.getElements()).toHaveLength(3);
  });

  test("paste with nothing on the clipboard is unhandled", () => {
    const { clipboard } = fakeClipboard();

    expect(
      commandPaste.perform({ editor, clipboard }, { clipboardData: null }),
    ).toEqual({ handled: false });
    expect(editor.getElements()).toHaveLength(2);
  });
});

describe("history and viewport commands", () => {
  test("undo and redo are enabled from the editor's history", () => {
    const editor = createSketchEditor();
    const context = { editor, clipboard: fakeClipboard().clipboard };
    expect(commandUndo.isEnabled?.(context)).toBe(false);

    editor.setTool("rectangle");
    editor.pointerDown({ x: 0, y: 0 }, { button: 0, shiftKey: false });
    editor.pointerMove({ x: 40, y: 40 });
    editor.pointerUp();
    expect(commandUndo.isEnabled?.(context)).toBe(true);

    commandUndo.perform(context, undefined);
    expect(editor.getElements()).toHaveLength(0);
    expect(commandRedo.isEnabled?.(context)).toBe(true);

    commandRedo.perform(context, undefined);
    expect(editor.getElements()).toHaveLength(1);
  });

  test("starts and stops panning", () => {
    const editor = createSketchEditor();
    const context = { editor, clipboard: fakeClipboard().clipboard };
    expect(commandStopPanning.isEnabled?.(context)).toBe(false);

    commandStartPanning.perform(context, undefined);
    expect(editor.getState().panMode).toBe(true);
    expect(commandStopPanning.isEnabled?.(context)).toBe(true);

    commandStopPanning.perform(context, undefined);
    expect(editor.getState().panMode).toBe(false);
  });
});
