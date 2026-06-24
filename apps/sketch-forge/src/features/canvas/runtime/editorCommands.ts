import {
  defineEditorCommand,
  getContextualPasteTranslation,
  type CanvasViewportBounds,
  type EditorCommandManager,
  type EditorCommand,
} from "@repo/canvas-engine";
import type { ActiveTool, Point, SketchElement } from "@repo/element";
import type { CanvasClipboardService } from "./CanvasClipboardService";

type BooleanRef = { current: boolean };

export type CanvasEditorCommandContext = {
  tool: ActiveTool;
  canUndo: boolean;
  canRedo: boolean;
  clipboard: CanvasClipboardService;
  getSelectedElements: () => SketchElement[];
  getPointerPosition: () => Point | null;
  getViewportBounds: () => CanvasViewportBounds | null;
  pasteElements: (elements: SketchElement[], offset: Point) => boolean;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  deselect: () => void;
  editSelected: () => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: ActiveTool) => void;
  isPanningRef: BooleanRef;
  setIsPanningMode: (isPanning: boolean) => void;
  stopPanning: () => void;
};

export type ClipboardCommandPayload = {
  clipboardData: DataTransfer | null;
};

export type SetToolCommandPayload = {
  tool: ActiveTool;
};

const handled = { handled: true } as const;
const unhandled = { handled: false } as const;

export const commandCopy = defineEditorCommand<
  CanvasEditorCommandContext,
  ClipboardCommandPayload
>({
  id: "clipboard.copy",
  perform: (context, { clipboardData }) => ({
    handled: context.clipboard.write(
      clipboardData,
      context.getSelectedElements(),
    ),
  }),
});

export const commandCut = defineEditorCommand<
  CanvasEditorCommandContext,
  ClipboardCommandPayload
>({
  id: "clipboard.cut",
  perform: (context, { clipboardData }) => {
    const didWrite = context.clipboard.write(
      clipboardData,
      context.getSelectedElements(),
    );

    if (!didWrite) return unhandled;
    context.deleteSelected();
    return handled;
  },
});

export const commandPaste = defineEditorCommand<
  CanvasEditorCommandContext,
  ClipboardCommandPayload
>({
  id: "clipboard.paste",
  perform: (context, { clipboardData }) => {
    const clipboard = context.clipboard.read(clipboardData);
    if (!clipboard) return unhandled;

    const translation = getContextualPasteTranslation(clipboard.elements, {
      selectedElements: context.getSelectedElements(),
      pointer: context.getPointerPosition(),
      viewport: context.getViewportBounds(),
    });

    return {
      handled: context.pasteElements(clipboard.elements, translation),
    };
  },
});

export const commandUndo = defineEditorCommand<CanvasEditorCommandContext>({
  id: "history.undo",
  isEnabled: (context) => context.canUndo,
  perform: (context) => {
    context.undo();
    return handled;
  },
});

export const commandRedo = defineEditorCommand<CanvasEditorCommandContext>({
  id: "history.redo",
  isEnabled: (context) => context.canRedo,
  perform: (context) => {
    context.redo();
    return handled;
  },
});

export const commandDeleteSelected =
  defineEditorCommand<CanvasEditorCommandContext>({
    id: "selection.delete",
    isEnabled: (context) => context.getSelectedElements().length > 0,
    perform: (context) => {
      context.deleteSelected();
      return handled;
    },
  });

export const commandDuplicateSelected =
  defineEditorCommand<CanvasEditorCommandContext>({
    id: "selection.duplicate",
    isEnabled: (context) => context.getSelectedElements().length > 0,
    perform: (context) => {
      context.duplicateSelected();
      return handled;
    },
  });

export const commandDeselect = defineEditorCommand<CanvasEditorCommandContext>({
  id: "selection.deselect",
  isEnabled: (context) => context.getSelectedElements().length > 0,
  perform: (context) => {
    context.deselect();
    return handled;
  },
});

export const commandEditSelected =
  defineEditorCommand<CanvasEditorCommandContext>({
    id: "selection.edit",
    isEnabled: (context) =>
      context.tool === "select" && context.getSelectedElements().length === 1,
    perform: (context) => {
      context.editSelected();
      return handled;
    },
  });

export const commandSetTool = defineEditorCommand<
  CanvasEditorCommandContext,
  SetToolCommandPayload
>({
  id: "tool.set",
  perform: (context, { tool }) => {
    context.setTool(tool);
    return handled;
  },
});

export const commandStartPanning =
  defineEditorCommand<CanvasEditorCommandContext>({
    id: "viewport.pan.start",
    perform: (context) => {
      context.isPanningRef.current = true;
      context.setIsPanningMode(true);
      return handled;
    },
  });

export const commandStopPanning =
  defineEditorCommand<CanvasEditorCommandContext>({
    id: "viewport.pan.stop",
    isEnabled: (context) => context.isPanningRef.current,
    perform: (context) => {
      context.isPanningRef.current = false;
      context.setIsPanningMode(false);
      context.stopPanning();
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
