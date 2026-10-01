import {
  defineEditorCommand,
  type EditorCommandManager,
  type EditorCommand,
  type SketchEditor,
} from "@repo/canvas-engine";
import type { ActiveTool } from "@repo/element";
import type { CanvasClipboard } from "../utils/canvasClipboard";

/** What every canvas command runs against. */
export type CanvasEditorCommandContext = {
  editor: SketchEditor;
  clipboard: CanvasClipboard;
};

export type ClipboardCommandPayload = {
  clipboardData: DataTransfer | null;
};

export type SetToolCommandPayload = {
  tool: ActiveTool;
};

const handled = { handled: true } as const;
const unhandled = { handled: false } as const;

const hasSelection = ({ editor }: CanvasEditorCommandContext) =>
  editor.getSelectedElements().length > 0;

export const commandCopy = defineEditorCommand<
  CanvasEditorCommandContext,
  ClipboardCommandPayload
>({
  id: "clipboard.copy",
  perform: ({ editor, clipboard }, { clipboardData }) => ({
    handled: clipboard.write(clipboardData, editor.getSelectedElements()),
  }),
});

export const commandCut = defineEditorCommand<
  CanvasEditorCommandContext,
  ClipboardCommandPayload
>({
  id: "clipboard.cut",
  perform: ({ editor, clipboard }, { clipboardData }) => {
    if (!clipboard.write(clipboardData, editor.getSelectedElements())) {
      return unhandled;
    }
    editor.deleteSelected();
    return handled;
  },
});

export const commandPaste = defineEditorCommand<
  CanvasEditorCommandContext,
  ClipboardCommandPayload
>({
  id: "clipboard.paste",
  perform: ({ editor, clipboard }, { clipboardData }) => {
    const payload = clipboard.read(clipboardData);
    if (payload) return { handled: editor.paste(payload.elements) };

    // No internal element payload, so fall back to a clipboard image
    // (e.g. a pasted screenshot).
    return editor.pasteImage(clipboardData) ? handled : unhandled;
  },
});

export const commandUndo = defineEditorCommand<CanvasEditorCommandContext>({
  id: "history.undo",
  isEnabled: ({ editor }) => editor.getState().canUndo,
  perform: ({ editor }) => {
    editor.undo();
    return handled;
  },
});

export const commandRedo = defineEditorCommand<CanvasEditorCommandContext>({
  id: "history.redo",
  isEnabled: ({ editor }) => editor.getState().canRedo,
  perform: ({ editor }) => {
    editor.redo();
    return handled;
  },
});

export const commandDeleteSelected =
  defineEditorCommand<CanvasEditorCommandContext>({
    id: "selection.delete",
    isEnabled: hasSelection,
    perform: ({ editor }) => {
      editor.deleteSelected();
      return handled;
    },
  });

export const commandDuplicateSelected =
  defineEditorCommand<CanvasEditorCommandContext>({
    id: "selection.duplicate",
    isEnabled: hasSelection,
    perform: ({ editor }) => {
      editor.duplicateSelected();
      return handled;
    },
  });

export const commandDeselect = defineEditorCommand<CanvasEditorCommandContext>({
  id: "selection.deselect",
  isEnabled: hasSelection,
  perform: ({ editor }) => {
    editor.deselect();
    return handled;
  },
});

export const commandEditSelected =
  defineEditorCommand<CanvasEditorCommandContext>({
    id: "selection.edit",
    isEnabled: ({ editor }) =>
      editor.getState().activeTool === "select" &&
      editor.getSelectedElements().length === 1,
    perform: ({ editor }) => {
      editor.editSelected();
      return handled;
    },
  });

export const commandSetTool = defineEditorCommand<
  CanvasEditorCommandContext,
  SetToolCommandPayload
>({
  id: "tool.set",
  perform: ({ editor }, { tool }) => {
    editor.setTool(tool);
    return handled;
  },
});

export const commandStartPanning =
  defineEditorCommand<CanvasEditorCommandContext>({
    id: "viewport.pan.start",
    perform: ({ editor }) => {
      editor.setPanMode(true);
      return handled;
    },
  });

export const commandStopPanning =
  defineEditorCommand<CanvasEditorCommandContext>({
    id: "viewport.pan.stop",
    isEnabled: ({ editor }) => editor.getState().panMode,
    perform: ({ editor }) => {
      editor.setPanMode(false);
      return handled;
    },
  });

export type CanvasEditorCommand<Payload = undefined> = EditorCommand<
  CanvasEditorCommandContext,
  Payload
>;

export function registerCanvasEditorCommands(
  manager: EditorCommandManager<CanvasEditorCommandContext>,
) {
  manager.register(commandCopy);
  manager.register(commandCut);
  manager.register(commandPaste);
  manager.register(commandUndo);
  manager.register(commandRedo);
  manager.register(commandDeleteSelected);
  manager.register(commandDuplicateSelected);
  manager.register(commandDeselect);
  manager.register(commandEditSelected);
  manager.register(commandSetTool);
  manager.register(commandStartPanning);
  manager.register(commandStopPanning);
}
