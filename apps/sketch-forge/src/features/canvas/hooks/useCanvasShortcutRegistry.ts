"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CanvasShortcutRegistry,
  normalizeShortcutChord,
  shortcutChordsEqual,
  type CanvasShortcutEntry,
  type ShortcutChord,
  type ShortcutOverrideMap,
} from "../runtime/shortcutRegistry";

const STORAGE_KEY = "sketch-forge:canvas-shortcuts";

export type ShortcutConflict = {
  existing: CanvasShortcutEntry;
  requested: ShortcutChord;
};

export type ShortcutAssignmentMode = "replace" | "swap";

export type ShortcutAssignmentResult =
  | { status: "assigned" }
  | { status: "conflict"; conflict: ShortcutConflict };

export function useCanvasShortcutRegistry() {
  const [overrides, setOverrides] = useState<ShortcutOverrideMap>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as ShortcutOverrideMap;
      if (parsed && typeof parsed === "object") {
        setOverrides(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }, [overrides]);

  const registry = useMemo(
    () => new CanvasShortcutRegistry(overrides),
    [overrides],
  );

  const assignShortcut = useCallback(
    (
      id: string,
      chord: ShortcutChord,
      mode?: ShortcutAssignmentMode,
    ): ShortcutAssignmentResult => {
      const requested = normalizeShortcutChord(chord);
      const target = registry.getEntry(id);
      if (!target || !target.editable) return { status: "assigned" };

      const existing = registry.findConflict(requested, id);
      if (existing && (!mode || !existing.editable)) {
        return { status: "conflict", conflict: { existing, requested } };
      }

      setOverrides((current) => {
        const currentRegistry = new CanvasShortcutRegistry(current);
        const currentTarget = currentRegistry.getEntry(id);
        const currentExisting = currentRegistry.findConflict(requested, id);
        const next: ShortcutOverrideMap = {
          ...current,
          [id]: requested,
        };

        if (currentExisting?.editable) {
          if (mode === "swap" && currentTarget?.shortcut) {
            next[currentExisting.id] = currentTarget.shortcut;
          } else if (mode === "replace") {
            next[currentExisting.id] = null;
          }
        }

        return next;
      });

      return { status: "assigned" };
    },
    [registry],
  );

  const resetShortcut = useCallback((id: string) => {
    setOverrides((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, id)) return current;

      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const hasCustomShortcut = useCallback(
    (entry: CanvasShortcutEntry) =>
      entry.isCustomized &&
      !shortcutChordsEqual(
        entry.shortcut ?? entry.defaultShortcut,
        entry.defaultShortcut,
      ),
    [],
  );

  return {
    registry,
    entries: registry.getEntries(),
    assignShortcut,
    resetShortcut,
    hasCustomShortcut,
  };
}

export type CanvasShortcutSettings = ReturnType<
  typeof useCanvasShortcutRegistry
>;
