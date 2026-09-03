import { describe, expect, test } from "bun:test";
import type { SketchElement } from "@repo/element";
import type { CanvasClipboardService } from "./CanvasClipboardService";
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

function makeElement(overrides: Partial<SketchElement> = {}): SketchElement {
  return {
    id: "element",
    tool: "rectangle",
    x1: 0,
    y1: 0,
    x2: 10,
    y2: 10,
    seed: 1,
    strokeColor: "#000",
    fillColor: "none",
    fillStyle: "none",
    strokeWidth: 2,
    ...overrides,
  };
}

function createContext(
  overrides: Partial<CanvasEditorCommandContext> = {},
): CanvasEditorCommandContext {
  return {
    tool: "select",
    canUndo: false,
    canRedo: false,
    clipboard: {
      write: () => false,
      read: () => null,
    } as CanvasClipboardService,
    getSelectedElements: () => [],
    getPointerPosition: () => null,
    getViewportBounds: () => null,
    pasteElements: () => false,
    pasteImage: () => false,
    deleteSelected: () => {},
    duplicateSelected: () => {},
    deselect: () => {},
    editSelected: () => {},
    undo: () => {},
    redo: () => {},
    setTool: () => {},
    isPanningRef: { current: false },
    setIsPanningMode: () => {},
    stopPanning: () => {},
    ...overrides,
  };
}

describe("clipboard editor commands", () => {
  test("copy reports whether the clipboard write succeeded", () => {
    const selected = [makeElement()];
    let received: SketchElement[] = [];
    const context = createContext({
      getSelectedElements: () => selected,
      clipboard: {
        write(_clipboardData, elements) {
          received = elements;
          return true;
        },
        read: () => null,
      } as CanvasClipboardService,
    });

    expect(commandCopy.perform(context, { clipboardData: null })).toEqual({
      handled: true,
    });
    expect(received).toEqual(selected);
  });

  test("cut deletes only after a successful clipboard write", () => {
    let deleteCount = 0;
    const context = createContext({
      deleteSelected: () => deleteCount++,
      clipboard: {
        write: () => false,
        read: () => null,
      } as CanvasClipboardService,
    });

    expect(commandCut.perform(context, { clipboardData: null })).toEqual({
      handled: false,
    });
    expect(deleteCount).toBe(0);

    context.clipboard = {
      write: () => true,
      read: () => null,
    } as CanvasClipboardService;
    expect(commandCut.perform(context, { clipboardData: null })).toEqual({
      handled: true,
    });
    expect(deleteCount).toBe(1);
  });

  test("pastes internal elements after the current selection", () => {
    const copied = [makeElement({ id: "copied" })];
    const selected = [
      makeElement({ id: "selected", x1: 100, y1: 200, x2: 120, y2: 220 }),
    ];
    let translation = { x: 0, y: 0 };
    const context = createContext({
      clipboard: {
        write: () => false,
        read: () => ({ elements: copied, fingerprint: "payload" }),
      } as CanvasClipboardService,
      getSelectedElements: () => selected,
      pasteElements(_elements, offset) {
        translation = offset;
        return true;
      },
    });

    expect(commandPaste.perform(context, { clipboardData: null })).toEqual({
      handled: true,
    });
    expect(translation).toEqual({ x: 124, y: 224 });
  });

  test("falls back to image paste when no internal payload exists", () => {
    let imagePasteCount = 0;
    const context = createContext({
      pasteImage() {
        imagePasteCount++;
        return true;
      },
    });

    expect(commandPaste.perform(context, { clipboardData: null })).toEqual({
      handled: true,
    });
    expect(imagePasteCount).toBe(1);
  });
});

describe("history and viewport editor commands", () => {
  test("enables undo and redo from current history state", () => {
    const disabled = createContext();
    expect(commandUndo.isEnabled?.(disabled)).toBe(false);
    expect(commandRedo.isEnabled?.(disabled)).toBe(false);

    let undoCount = 0;
    let redoCount = 0;
    const enabled = createContext({
      canUndo: true,
      canRedo: true,
      undo: () => undoCount++,
      redo: () => redoCount++,
    });
    commandUndo.perform(enabled, undefined);
    commandRedo.perform(enabled, undefined);

    expect(undoCount).toBe(1);
    expect(redoCount).toBe(1);
  });

  test("starts and stops panning consistently", () => {
    const modes: boolean[] = [];
    let stopCount = 0;
    const context = createContext({
      setIsPanningMode: (value) => modes.push(value),
      stopPanning: () => stopCount++,
    });

    commandStartPanning.perform(context, undefined);
    expect(context.isPanningRef.current).toBe(true);
    expect(commandStopPanning.isEnabled?.(context)).toBe(true);

    commandStopPanning.perform(context, undefined);
    expect(context.isPanningRef.current).toBe(false);
    expect(modes).toEqual([true, false]);
    expect(stopCount).toBe(1);
  });
});
