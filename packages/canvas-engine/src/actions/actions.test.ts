import { describe, expect, test } from "bun:test";
import { createHistory } from "@repo/element/history";
import type { SketchElement } from "@repo/element/types";
import { createInitialAppState, updateAppState } from "../appState";
import {
  actionAddElement,
  actionInsertElements,
  actionReplaceScene,
} from "./elements";
import { dispatchAction, performAction } from "./manager";
import {
  actionDeleteSelected,
  actionDeselect,
  actionDuplicateSelected,
} from "./selection";

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

describe("canvas element actions", () => {
  test("adds and selects a new element", () => {
    const element = makeElement();
    const result = performAction(
      actionAddElement,
      { elements: [], appState: createInitialAppState() },
      { element },
    );

    expect(result).not.toBe(false);
    if (!result) return;
    expect(result.elements).toEqual([element]);
    expect(result.appState?.selectedElementIds).toEqual(new Set([element.id]));
    expect(result.appState?.selectedTool).toBe("rectangle");
    expect(result.captureUpdate).toBe("history");
  });

  test("inserts a batch and switches to select mode", () => {
    const first = makeElement({ id: "first" });
    const second = makeElement({ id: "second" });
    const result = performAction(
      actionInsertElements,
      { elements: [], appState: createInitialAppState() },
      { elements: [first, second] },
    );

    expect(result).not.toBe(false);
    if (!result) return;
    expect(result.elements).toEqual([first, second]);
    expect(result.appState?.selectedElementIds).toEqual(
      new Set(["first", "second"]),
    );
    expect(result.appState?.activeTool).toBe("select");
  });

  test("does not insert an empty batch", () => {
    expect(
      performAction(
        actionInsertElements,
        { elements: [], appState: createInitialAppState() },
        { elements: [] },
      ),
    ).toBe(false);
  });

  test("replacing a scene clears selection state", () => {
    const appState = {
      ...createInitialAppState(),
      selectedElementIds: new Set(["old"]),
      selectedTool: "rectangle" as const,
    };
    const replacement = [makeElement({ id: "replacement" })];
    const result = performAction(
      actionReplaceScene,
      { elements: [makeElement({ id: "old" })], appState },
      { elements: replacement },
    );

    expect(result).not.toBe(false);
    if (!result) return;
    expect(result.elements).toEqual(replacement);
    expect(result.appState?.selectedElementIds).toEqual(new Set());
    expect(result.appState?.selectedTool).toBeNull();
  });
});

describe("canvas selection actions", () => {
  test("deletes selected elements and clears selection", () => {
    const first = makeElement({ id: "first" });
    const second = makeElement({ id: "second" });
    const appState = {
      ...createInitialAppState(),
      selectedElementIds: new Set(["first"]),
      selectedTool: "rectangle" as const,
    };
    const result = performAction(
      actionDeleteSelected,
      { elements: [first, second], appState },
      undefined,
    );

    expect(result).not.toBe(false);
    if (!result) return;
    expect(result.elements).toEqual([second]);
    expect(result.appState?.selectedElementIds).toEqual(new Set());
    expect(result.captureUpdate).toBe("history");
  });

  test("duplicates selected elements with fresh ids and an offset", () => {
    const original = makeElement({ id: "original" });
    const appState = {
      ...createInitialAppState(),
      selectedElementIds: new Set(["original"]),
    };
    const result = performAction(
      actionDuplicateSelected,
      { elements: [original], appState },
      { offset: 12 },
    );

    expect(result).not.toBe(false);
    if (!result || !result.elements) return;
    const duplicate = result.elements[1]!;
    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.x1).toBe(12);
    expect(duplicate.y1).toBe(12);
    expect(result.appState?.selectedElementIds).toEqual(
      new Set([duplicate.id]),
    );
  });

  test("returns false when delete or duplicate has no selection", () => {
    const context = {
      elements: [makeElement()],
      appState: createInitialAppState(),
    };

    expect(performAction(actionDeleteSelected, context, undefined)).toBe(false);
    expect(
      performAction(actionDuplicateSelected, context, { offset: 12 }),
    ).toBe(false);
  });

  test("deselects without creating a history entry", () => {
    const appState = {
      ...createInitialAppState(),
      selectedElementIds: new Set(["element"]),
      selectedTool: "rectangle" as const,
    };
    const result = performAction(
      actionDeselect,
      { elements: [makeElement()], appState },
      undefined,
    );

    expect(result).not.toBe(false);
    if (!result) return;
    expect(result.appState?.selectedElementIds).toEqual(new Set());
    expect(result.captureUpdate).toBe("none");
  });
});

describe("action dispatch integration", () => {
  /**
   * A stand-in for the editor. The point of the five-method dispatcher is that
   * a test can be one of the two adapters without pulling in React or a canvas.
   */
  function makeDispatcher() {
    const history = createHistory();
    let elements: SketchElement[] = [];
    let appState = createInitialAppState();
    let captureCount = 0;

    return {
      history,
      get elements() {
        return elements;
      },
      get appState() {
        return appState;
      },
      get captureCount() {
        return captureCount;
      },
      dispatcher: {
        getElements: () => elements,
        setSceneElements(next: SketchElement[]) {
          elements = next;
        },
        getAppState: () => appState,
        setAppState(updates: Partial<typeof appState>) {
          appState = updateAppState(appState, updates);
        },
        captureHistory() {
          captureCount++;
          history.push([...elements]);
        },
      },
    };
  }

  test("applies element and app-state updates and captures history", () => {
    const target = makeDispatcher();
    const element = makeElement();

    const result = dispatchAction(target.dispatcher, actionAddElement, {
      element,
    });

    expect(result).not.toBe(false);
    expect(target.elements).toEqual([element]);
    expect(target.appState.selectedElementIds).toEqual(new Set([element.id]));
    expect(target.history.getCurrent()).toEqual([element]);
    expect(target.captureCount).toBe(1);
  });

  test("does not touch the dispatcher when an action returns false", () => {
    const target = makeDispatcher();

    const result = dispatchAction(
      target.dispatcher,
      actionDeleteSelected,
      undefined,
    );

    expect(result).toBe(false);
    expect(target.elements).toEqual([]);
    expect(target.history.getCurrent()).toEqual([]);
    expect(target.captureCount).toBe(0);
  });
});
