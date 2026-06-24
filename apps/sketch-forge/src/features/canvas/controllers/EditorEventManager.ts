import { EVENT } from "@repo/common";
import type { EditorCommandManager } from "@repo/canvas-engine";
import { isEditableTarget } from "../utils/isEditableTarget";
import {
  commandCopy,
  commandCut,
  commandPaste,
  commandStopPanning,
  type CanvasEditorCommandContext,
} from "../runtime/editorCommands";
import type { CanvasShortcutRegistry } from "../runtime/shortcutRegistry";

export class EditorEventManager {
  private abortController: AbortController | null = null;

  constructor(
    private readonly commands: EditorCommandManager<CanvasEditorCommandContext>,
    private readonly shortcuts: CanvasShortcutRegistry,
  ) {}

  attach() {
    this.detach();

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    document.addEventListener(EVENT.COPY, this.handleCopy, { signal });
    document.addEventListener(EVENT.CUT, this.handleCut, { signal });
    document.addEventListener(EVENT.PASTE, this.handlePaste, { signal });
    window.addEventListener(EVENT.KEY_DOWN, this.handleKeyDown, { signal });
    window.addEventListener(EVENT.KEY_UP, this.handleKeyUp, { signal });
  }

  detach() {
    this.abortController?.abort();
    this.abortController = null;
  }

  private handleCopy = (event: ClipboardEvent) => {
    this.handleClipboardCommand(event, commandCopy);
  };

  private handleCut = (event: ClipboardEvent) => {
    this.handleClipboardCommand(event, commandCut);
  };

  private handlePaste = (event: ClipboardEvent) => {
    this.handleClipboardCommand(event, commandPaste);
  };

  private handleClipboardCommand = (
    event: ClipboardEvent,
    command: typeof commandCopy | typeof commandCut | typeof commandPaste,
  ) => {
    if (isEditableTarget(event.target)) return;

    const handled = this.commands.execute(command, {
      clipboardData: event.clipboardData,
    });

    if (handled) event.preventDefault();
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return;

    const invocation = this.shortcuts.resolveKeyDown(event);
    if (!invocation) return;

    if (invocation.execute(this.commands)) {
      event.preventDefault();
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (event.code !== "Space") return;

    if (this.commands.execute(commandStopPanning, undefined)) {
      event.preventDefault();
    }
  };
}
