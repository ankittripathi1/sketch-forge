"use client";

import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { Tool } from "@repo/canvas-core/types";

interface UseCanvasShortcutsOptions {
  tool: Tool;
  setTool: (tool: Tool) => void;
  deleteSelected: () => void;
  deselect: () => void;
  duplicateSelected: () => void;
  editSelected: () => void;
  isPanningRef: MutableRefObject<boolean>;
  redo: () => void;
  setIsPanningMode: (isPanning: boolean) => void;
  stopPanning: () => void;
  undo: () => void;
}

export function useCanvasShortcuts({
  tool,
  setTool,
  deleteSelected,
  deselect,
  duplicateSelected,
  editSelected,
  isPanningRef,
  redo,
  setIsPanningMode,
  stopPanning,
  undo,
}: UseCanvasShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      if (e.key === "Enter" && tool === "select") {
        e.preventDefault();
        editSelected();
        return;
      }

      if (mod && e.shiftKey && e.key === "z") {
        e.preventDefault();
        redo();
        return;
      }

      if (mod && e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        isPanningRef.current = true;
        setIsPanningMode(true);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
        return;
      }

      if (e.key === "Escape") {
        deselect();
        return;
      }

      switch (e.key.toLowerCase()) {
        case "s":
          setTool("select");
          break;
        case "r":
          setTool("rectangle");
          break;
        case "e":
          setTool("ellipse");
          break;
        case "d":
          setTool("diamond");
          break;
        case "l":
          setTool("line");
          break;
        case "a":
          setTool("arrow");
          break;
        case "f":
          setTool("freehand");
          break;
        case "h":
          setTool("highlighter");
          break;
        case "t":
          setTool("text");
          break;
        case "x":
          setTool("eraser");
          break;
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        isPanningRef.current = false;
        setIsPanningMode(false);
        stopPanning();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    deleteSelected,
    deselect,
    duplicateSelected,
    editSelected,
    isPanningRef,
    redo,
    setIsPanningMode,
    setTool,
    stopPanning,
    tool,
    undo,
  ]);
}
