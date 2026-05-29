import type { SketchElement } from "@repo/canvas-core/types";

export function getSelectedElements(
  elements: SketchElement[],
  selectedIds: Set<string>,
): SketchElement[] {
  return elements.filter((el) => selectedIds.has(el.id));
}

export function setSelection(ids: Iterable<string>): Set<string> {
  return new Set(ids);
}

export function addToSelection(
  selectedIds: Set<string>,
  ids: Iterable<string>,
): Set<string> {
  const next = new Set(selectedIds);
  for (const id of ids) next.add(id);
  return next;
}

export function removeFromSelection(
  selectedIds: Set<string>,
  ids: Iterable<string>,
): Set<string> {
  const next = new Set(selectedIds);
  for (const id of ids) next.delete(id);
  return next;
}

export function toggleSelection(
  selectionIds: Set<string>,
  id: string,
): Set<string> {
  const next = new Set(selectionIds);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
