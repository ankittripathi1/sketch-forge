import { useEffect, useRef } from "react";
import { EditorCommandManager } from "@repo/canvas-engine";
import { EditorEventManager } from "../controllers/EditorEventManager";
import { CanvasClipboardService } from "../runtime/CanvasClipboardService";
import {
  registerCanvasEditorCommands,
  type CanvasEditorCommandContext,
} from "../runtime/editorCommands";
import type { CanvasShortcutRegistry } from "../runtime/shortcutRegistry";

type CanvasEditorRuntimeApi = Omit<CanvasEditorCommandContext, "clipboard">;

export function useCanvasEditorRuntime(
  api: CanvasEditorRuntimeApi,
  shortcuts: CanvasShortcutRegistry,
) {
  const apiRef = useRef(api);
  apiRef.current = api;

  const clipboardRef = useRef<CanvasClipboardService | null>(null);
  if (!clipboardRef.current) {
    clipboardRef.current = new CanvasClipboardService();
  }

  const managerRef =
    useRef<EditorCommandManager<CanvasEditorCommandContext> | null>(null);

  if (!managerRef.current) {
    managerRef.current = new EditorCommandManager(() => ({
      ...apiRef.current,
      clipboard: clipboardRef.current!,
    }));
    registerCanvasEditorCommands(managerRef.current);
  }

  useEffect(() => {
    const events = new EditorEventManager(managerRef.current!, shortcuts);
    events.attach();
    return () => events.detach();
  }, [shortcuts]);

  return managerRef.current;
}
