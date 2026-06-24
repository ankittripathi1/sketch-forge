"use client";

import { Keyboard, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useShortcutPlatform } from "../hooks/useShortcutPlatform";
import type {
  CanvasShortcutSettings,
  ShortcutConflict,
} from "../hooks/useCanvasShortcutRegistry";
import {
  formatShortcutChord,
  formatShortcutList,
  shortcutChordFromKeyboardEvent,
  type ShortcutChord,
} from "../runtime/shortcutRegistry";

type KeyboardShortcutSettingsProps = {
  shortcuts: CanvasShortcutSettings;
};

export function KeyboardShortcutSettings({
  shortcuts,
}: KeyboardShortcutSettingsProps) {
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(
    null,
  );
  const [shortcutConflict, setShortcutConflict] = useState<{
    targetId: string;
    requested: ShortcutChord;
    conflict: ShortcutConflict;
  } | null>(null);
  const shortcutCaptureRef = useRef<HTMLDivElement>(null);
  const { isMac } = useShortcutPlatform();

  useEffect(() => {
    if (!editingShortcutId) return;
    shortcutCaptureRef.current?.focus();
  }, [editingShortcutId]);

  const shortcutGroups = shortcuts.entries.reduce(
    (groups, entry) => {
      const group = groups[entry.group] ?? [];
      group.push(entry);
      groups[entry.group] = group;
      return groups;
    },
    {} as Record<string, typeof shortcuts.entries>,
  );

  function startEditingShortcut(id: string) {
    setShortcutConflict(null);
    setEditingShortcutId(id);
  }

  function cancelEditingShortcut() {
    setEditingShortcutId(null);
    setShortcutConflict(null);
  }

  function handleShortcutCapture(event: KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      cancelEditingShortcut();
      return;
    }

    if (!editingShortcutId) return;

    const chord = shortcutChordFromKeyboardEvent(event.nativeEvent);
    if (!chord) return;

    const result = shortcuts.assignShortcut(editingShortcutId, chord);
    if (result.status === "conflict") {
      setShortcutConflict({
        targetId: editingShortcutId,
        requested: chord,
        conflict: result.conflict,
      });
      return;
    }

    cancelEditingShortcut();
  }

  function resolveShortcutConflict(mode: "replace" | "swap") {
    if (!shortcutConflict) return;

    shortcuts.assignShortcut(
      shortcutConflict.targetId,
      shortcutConflict.requested,
      mode,
    );
    cancelEditingShortcut();
  }

  return (
    <>
      <div className="rounded-[18px] border border-border-subtle bg-surface-raised p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-surface-hover">
            <Keyboard size={17} className="text-text-secondary" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-[-0.025em] text-text-heading">
              Canvas shortcuts
            </p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Click an editable shortcut, then press the new key combination.
              System shortcuts are shown but locked.
            </p>
          </div>
        </div>

        {editingShortcutId && (
          <div
            ref={shortcutCaptureRef}
            tabIndex={0}
            onKeyDown={handleShortcutCapture}
            className="mb-4 rounded-[12px] border border-border-accent bg-accent-subtle px-3.5 py-3 text-sm text-accent outline-none"
          >
            Press a new shortcut, or Esc to cancel.
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {Object.entries(shortcutGroups).map(([group, entries]) => (
            <div key={group} className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                {group}
              </p>
              <div className="flex flex-col gap-1">
                {entries.map((entry) => {
                  const isEditing = editingShortcutId === entry.id;
                  const shortcutLabel = formatShortcutList(entry, isMac);

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 rounded-[12px] px-2.5 py-2 hover:bg-surface-hover"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">
                        {entry.label}
                      </span>
                      <button
                        type="button"
                        disabled={!entry.editable}
                        onClick={() =>
                          entry.editable
                            ? startEditingShortcut(entry.id)
                            : undefined
                        }
                        className={[
                          "rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors",
                          isEditing
                            ? "border-border-accent bg-accent-subtle text-accent"
                            : entry.editable
                              ? "border-border-subtle bg-surface-sunken text-text-body hover:border-border-accent"
                              : "cursor-not-allowed border-border-subtle bg-surface-sunken text-text-dim",
                        ].join(" ")}
                      >
                        {shortcutLabel}
                      </button>
                      {entry.editable && entry.isCustomized && (
                        <button
                          type="button"
                          onClick={() => shortcuts.resetShortcut(entry.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-surface-sunken hover:text-text-body"
                          title={`Reset ${entry.label}`}
                        >
                          <RotateCcw size={13} strokeWidth={1.8} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 rounded-[12px] bg-surface-paper px-3.5 py-3 text-[11px] leading-5 text-text-secondary">
          Shortcut edits are saved on this device for now. Later we can sync
          them with the user account.
        </p>
      </div>

      {shortcutConflict && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-surface-overlay p-4 shadow-elev-3">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-subtle text-accent">
                <Keyboard size={16} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-body">
                  Shortcut already used
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {formatShortcutChord(shortcutConflict.requested, isMac)} is
                  already assigned to{" "}
                  <span className="font-semibold text-text-body">
                    {shortcutConflict.conflict.existing.label}
                  </span>
                  .
                  {!shortcutConflict.conflict.existing.editable &&
                    " That shortcut is reserved by the app."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={cancelEditingShortcut}
                className="rounded-lg px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-hover hover:text-text-body"
              >
                Cancel
              </button>
              {shortcutConflict.conflict.existing.editable && (
                <>
                  <button
                    type="button"
                    onClick={() => resolveShortcutConflict("replace")}
                    className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-medium text-text-body hover:bg-surface-hover"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveShortcutConflict("swap")}
                    className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-text hover:opacity-90"
                  >
                    Swap
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
