"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import {
  createSketchEditor,
  type ReadonlyElement,
  type SketchEditor,
} from "./editor/sketchEditor";
import type { CanvasTheme } from "./appState";

/**
 * React binding for {@link createSketchEditor}.
 *
 * Creates one editor for the component's lifetime, drawing on the two canvas
 * refs, and keeps its theme in sync with `canvasMode`. Read view state with
 * `useEditorSelector(editor, ...)` or, below a `CanvasEditorProvider`,
 * `useEditorState(...)`. `onChange` gets the scene after every edit.
 */
export function useSketchEngine(
  sceneCanvasRef: RefObject<HTMLCanvasElement | null>,
  interactionCanvasRef: RefObject<HTMLCanvasElement | null>,
  canvasMode: CanvasTheme = "light",
  onChange?: (elements: readonly ReadonlyElement[]) => void,
): { editor: SketchEditor } {
  // Read through a ref so a new `onChange` identity never rebuilds the editor.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [editor] = useState<SketchEditor>(() => {
    const created = createSketchEditor({
      surface: {
        scene: () => sceneCanvasRef.current,
        interaction: () => interactionCanvasRef.current,
      },
      theme: canvasMode,
      onChange: () => onChangeRef.current?.(created.getElements()),
    });
    return created;
  });

  useEffect(() => {
    editor.setTheme(canvasMode);
  }, [editor, canvasMode]);

  return { editor };
}
