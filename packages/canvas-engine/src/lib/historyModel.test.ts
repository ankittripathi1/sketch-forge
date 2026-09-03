import { describe, expect, test } from "bun:test";
import { createHistory } from "@repo/element/history";
import type { SketchElement } from "@repo/element/types";
import {
  getHistoryStatus,
  pushHistorySnapshot,
  redoHistory,
  undoHistory,
} from "./historyModel";

function makeElement(id: string): SketchElement {
  return {
    id,
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
  };
}

describe("history model", () => {
  test("reports the initial history status", () => {
    expect(getHistoryStatus(createHistory())).toEqual({
      canUndo: false,
      canRedo: false,
    });
  });

  test("returns updated status after pushing snapshots", () => {
    const history = createHistory();

    expect(pushHistorySnapshot(history, [makeElement("first")])).toEqual({
      canUndo: true,
      canRedo: false,
    });
    expect(history.getCurrent()).toEqual([makeElement("first")]);
  });

  test("returns snapshots together with undo and redo availability", () => {
    const history = createHistory();
    const first = [makeElement("first")];
    const second = [makeElement("second")];
    history.push(first);
    history.push(second);

    expect(undoHistory(history)).toEqual({
      snapshot: first,
      status: { canUndo: true, canRedo: true },
    });
    expect(redoHistory(history)).toEqual({
      snapshot: second,
      status: { canUndo: true, canRedo: false },
    });
  });

  test("returns null snapshots at history boundaries", () => {
    const history = createHistory();

    expect(undoHistory(history)).toEqual({
      snapshot: null,
      status: { canUndo: false, canRedo: false },
    });
    expect(redoHistory(history)).toEqual({
      snapshot: null,
      status: { canUndo: false, canRedo: false },
    });
  });
});
