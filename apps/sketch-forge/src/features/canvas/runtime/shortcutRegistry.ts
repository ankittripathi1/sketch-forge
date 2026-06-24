import type { EditorCommandManager } from "@repo/canvas-engine";
import type { ActiveTool } from "@repo/element";
import {
  commandDeleteSelected,
  commandDeselect,
  commandDuplicateSelected,
  commandEditSelected,
  commandRedo,
  commandSetTool,
  commandStartPanning,
  commandUndo,
  type CanvasEditorCommandContext,
} from "./editorCommands";

export type CanvasShortcutGroup =
  | "Tools"
  | "Selection"
  | "History"
  | "Clipboard"
  | "Navigation";

export type ShortcutChord = {
  key: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type ShortcutOverrideMap = Record<string, ShortcutChord | null>;

export type CanvasCommandInvocation = {
  execute: (
    manager: EditorCommandManager<CanvasEditorCommandContext>,
  ) => boolean;
};

export type CanvasShortcutDefinition = {
  id: string;
  label: string;
  group: CanvasShortcutGroup;
  defaultShortcut: ShortcutChord;
  aliases?: ShortcutChord[];
  editable: boolean;
  run?: () => CanvasCommandInvocation;
};

export type CanvasShortcutEntry = CanvasShortcutDefinition & {
  shortcut: ShortcutChord | null;
  isCustomized: boolean;
};

function invoke(
  run: (
    manager: EditorCommandManager<CanvasEditorCommandContext>,
  ) => boolean,
): CanvasCommandInvocation {
  return { execute: run };
}

function toolShortcut(
  tool: ActiveTool,
  label: string,
  key: string,
): CanvasShortcutDefinition {
  return {
    id: getToolShortcutId(tool),
    label,
    group: "Tools",
    defaultShortcut: { key },
    editable: true,
    run: () =>
      invoke((manager) => manager.execute(commandSetTool, { tool })),
  };
}

export function getToolShortcutId(tool: ActiveTool) {
  return `tool.${tool}`;
}

export const canvasShortcutDefinitions: CanvasShortcutDefinition[] = [
  toolShortcut("select", "Select", "s"),
  toolShortcut("rectangle", "Rectangle", "r"),
  toolShortcut("ellipse", "Ellipse", "e"),
  toolShortcut("diamond", "Diamond", "d"),
  toolShortcut("line", "Line", "l"),
  toolShortcut("arrow", "Arrow", "a"),
  toolShortcut("freehand", "Freehand", "f"),
  toolShortcut("highlighter", "Highlighter", "h"),
  toolShortcut("text", "Text", "t"),
  toolShortcut("eraser", "Eraser", "x"),
  {
    id: "history.undo",
    label: "Undo",
    group: "History",
    defaultShortcut: { key: "z", mod: true },
    editable: false,
    run: () => invoke((manager) => manager.execute(commandUndo, undefined)),
  },
  {
    id: "history.redo",
    label: "Redo",
    group: "History",
    defaultShortcut: { key: "z", mod: true, shift: true },
    aliases: [{ key: "y", mod: true }],
    editable: false,
    run: () => invoke((manager) => manager.execute(commandRedo, undefined)),
  },
  {
    id: "selection.duplicate",
    label: "Duplicate",
    group: "Selection",
    defaultShortcut: { key: "d", mod: true },
    editable: true,
    run: () =>
      invoke((manager) => manager.execute(commandDuplicateSelected, undefined)),
  },
  {
    id: "selection.delete",
    label: "Delete",
    group: "Selection",
    defaultShortcut: { key: "delete" },
    aliases: [{ key: "backspace" }],
    editable: true,
    run: () =>
      invoke((manager) => manager.execute(commandDeleteSelected, undefined)),
  },
  {
    id: "selection.deselect",
    label: "Deselect",
    group: "Selection",
    defaultShortcut: { key: "escape" },
    editable: true,
    run: () =>
      invoke((manager) => manager.execute(commandDeselect, undefined)),
  },
  {
    id: "selection.edit",
    label: "Edit selected",
    group: "Selection",
    defaultShortcut: { key: "enter" },
    editable: true,
    run: () =>
      invoke((manager) => manager.execute(commandEditSelected, undefined)),
  },
  {
    id: "viewport.pan",
    label: "Pan canvas",
    group: "Navigation",
    defaultShortcut: { key: "space" },
    editable: true,
    run: () =>
      invoke((manager) => manager.execute(commandStartPanning, undefined)),
  },
  {
    id: "clipboard.copy",
    label: "Copy",
    group: "Clipboard",
    defaultShortcut: { key: "c", mod: true },
    editable: false,
  },
  {
    id: "clipboard.cut",
    label: "Cut",
    group: "Clipboard",
    defaultShortcut: { key: "x", mod: true },
    editable: false,
  },
  {
    id: "clipboard.paste",
    label: "Paste",
    group: "Clipboard",
    defaultShortcut: { key: "v", mod: true },
    editable: false,
  },
];

const definitionsById = new Map(
  canvasShortcutDefinitions.map((definition) => [definition.id, definition]),
);

export class CanvasShortcutRegistry {
  constructor(private readonly overrides: ShortcutOverrideMap = {}) {}

  getEntries(): CanvasShortcutEntry[] {
    return canvasShortcutDefinitions.map((definition) => {
      const hasOverride = Object.prototype.hasOwnProperty.call(
        this.overrides,
        definition.id,
      );

      return {
        ...definition,
        shortcut: hasOverride
          ? this.overrides[definition.id]!
          : definition.defaultShortcut,
        isCustomized: hasOverride,
      };
    });
  }

  getEntry(id: string): CanvasShortcutEntry | null {
    const definition = definitionsById.get(id);
    if (!definition) return null;

    const hasOverride = Object.prototype.hasOwnProperty.call(
      this.overrides,
      id,
    );

    return {
      ...definition,
      shortcut: hasOverride ? this.overrides[id]! : definition.defaultShortcut,
      isCustomized: hasOverride,
    };
  }

  getTooltip(id: string, isMac: boolean): string {
    const entry = this.getEntry(id);
    if (!entry) return "";

    const shortcut = formatShortcutList(entry, isMac);

    return `${entry.label} · ${shortcut}`;
  }

  findConflict(chord: ShortcutChord, exceptId?: string) {
    for (const entry of this.getEntries()) {
      if (entry.id === exceptId) continue;
      if (entry.shortcut && shortcutChordsEqual(entry.shortcut, chord)) {
        return entry;
      }
      if (
        (entry.aliases ?? []).some((alias) => shortcutChordsEqual(alias, chord))
      ) {
        return { ...entry, editable: false };
      }
    }

    return null;
  }

  resolveKeyDown(event: KeyboardEvent): CanvasCommandInvocation | null {
    const chord = shortcutChordFromKeyboardEvent(event);
    if (!chord) return null;

    const entry = this.getEntries().find(
      (candidate) =>
        candidate.run &&
        shortcutMatchesEntry(chord, candidate),
    );

    return entry?.run?.() ?? null;
  }
}

export function shortcutChordFromKeyboardEvent(
  event: KeyboardEvent,
): ShortcutChord | null {
  const key = normalizeKeyboardKey(event);
  if (!key) return null;

  return normalizeShortcutChord({
    key,
    mod: event.metaKey || event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
  });
}

export function normalizeShortcutChord(chord: ShortcutChord): ShortcutChord {
  return {
    key: normalizeShortcutKey(chord.key),
    mod: chord.mod || undefined,
    shift: chord.shift || undefined,
    alt: chord.alt || undefined,
  };
}

export function shortcutChordsEqual(a: ShortcutChord, b: ShortcutChord) {
  const left = normalizeShortcutChord(a);
  const right = normalizeShortcutChord(b);
  return (
    left.key === right.key &&
    Boolean(left.mod) === Boolean(right.mod) &&
    Boolean(left.shift) === Boolean(right.shift) &&
    Boolean(left.alt) === Boolean(right.alt)
  );
}

export function formatShortcutChord(
  chord: ShortcutChord,
  isMac: boolean,
): string {
  const parts: string[] = [];

  if (chord.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (chord.alt) parts.push(isMac ? "⌥" : "Alt");
  if (chord.shift) parts.push(isMac ? "⇧" : "Shift");
  parts.push(formatShortcutKey(chord.key));

  return isMac ? parts.join("") : parts.join("+");
}

export function formatShortcutList(
  entry: Pick<CanvasShortcutEntry, "shortcut" | "aliases">,
  isMac: boolean,
): string {
  const chords = [entry.shortcut, ...(entry.aliases ?? [])].filter(
    (chord): chord is ShortcutChord => chord !== null,
  );

  if (chords.length === 0) return "Unassigned";
  return chords.map((chord) => formatShortcutChord(chord, isMac)).join(" / ");
}

function shortcutMatchesEntry(
  chord: ShortcutChord,
  entry: Pick<CanvasShortcutEntry, "shortcut" | "aliases">,
) {
  return [entry.shortcut, ...(entry.aliases ?? [])].some(
    (candidate) => candidate && shortcutChordsEqual(candidate, chord),
  );
}

function normalizeKeyboardKey(event: KeyboardEvent): string | null {
  if (event.key === " ") return "space";
  const key = normalizeShortcutKey(event.key);
  if (key === "meta" || key === "control" || key === "shift" || key === "alt") {
    return null;
  }
  return key;
}

function normalizeShortcutKey(key: string): string {
  const normalized = key.trim().toLowerCase();
  if (normalized === " ") return "space";
  if (normalized === "esc") return "escape";
  if (normalized === "del") return "delete";
  if (normalized === "arrowleft") return "left";
  if (normalized === "arrowright") return "right";
  if (normalized === "arrowup") return "up";
  if (normalized === "arrowdown") return "down";
  return normalized;
}

function formatShortcutKey(key: string): string {
  const normalized = normalizeShortcutKey(key);
  const labels: Record<string, string> = {
    backspace: "Backspace",
    delete: "Delete",
    enter: "Enter",
    escape: "Esc",
    space: "Space",
    tab: "Tab",
    left: "←",
    right: "→",
    up: "↑",
    down: "↓",
  };

  return labels[normalized] ?? normalized.toUpperCase();
}
