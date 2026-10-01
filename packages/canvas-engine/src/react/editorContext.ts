"use client";

import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import type {
  ReadonlyAppState,
  SketchEditor,
} from "../editor/sketchEditor";

const EditorContext = createContext<SketchEditor | null>(null);

/**
 * Puts the editor in scope for the canvas panels.
 *
 * The editor is per instance, not a module singleton, so panels that are
 * siblings of the canvas (the toolbar, the style panel) need a way to find it
 * without every value being threaded down as a prop.
 */
export function CanvasEditorProvider({
  editor,
  children,
}: {
  editor: SketchEditor;
  children: ReactNode;
}) {
  return createElement(EditorContext.Provider, { value: editor }, children);
}

export function useSketchEditor(): SketchEditor {
  const editor = useContext(EditorContext);
  if (!editor) {
    throw new Error(
      "useSketchEditor must be called inside a <CanvasEditorProvider>",
    );
  }
  return editor;
}

/**
 * Subscribes to one slice of the editor's view state.
 *
 * Pass the narrowest selector you can: the component re-renders only when the
 * selected value changes, so `useEditorState((s) => s.activeTool)` costs far
 * less than reading the whole state.
 */
export function useEditorState<T>(
  selector: (state: ReadonlyAppState) => T,
): T {
  return useStore(useSketchEditor().store, selector);
}
