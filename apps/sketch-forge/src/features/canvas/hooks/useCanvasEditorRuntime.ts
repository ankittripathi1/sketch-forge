import { useEffect, useState } from "react";
import { EditorCommandManager, type SketchEditor } from "@repo/canvas-engine";
import { EditorEventManager } from "../controllers/EditorEventManager";
import { canvasClipboard } from "../utils/canvasClipboard";
import {
  registerCanvasEditorCommands,
  type CanvasEditorCommandContext,
} from "../runtime/editorCommands";
import type { CanvasShortcutRegistry } from "../runtime/shortcutRegistry";

/**
 * Builds the canvas command manager for `editor` and wires it to keyboard and
 * clipboard events for as long as the component is mounted.
 */
export function useCanvasEditorRuntime(
  editor: SketchEditor,
  shortcuts: CanvasShortcutRegistry,
) {
  const [manager] = useState(() => {
    const next = new EditorCommandManager<CanvasEditorCommandContext>(() => ({
      editor,
      clipboard: canvasClipboard,
    }));
    registerCanvasEditorCommands(next);
    return next;
  });

  useEffect(() => {
    const events = new EditorEventManager(manager, shortcuts);
    events.attach();
    return () => events.detach();
  }, [manager, shortcuts]);

  return manager;
}
