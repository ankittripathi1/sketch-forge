import type { Point, SketchElement } from "./types";
import { randomId } from "@repo/common";

export function getSelectedElements(
  elements: SketchElement[],
  selectedIds: Set<string>,
): SketchElement[] {
  return elements.filter((el) => selectedIds.has(el.id));
}

export function mergeElementsById(
  elements: SketchElement[],
  next: SketchElement[],
): SketchElement[] {
  const nextById = new Map(next.map((el) => [el.id, el]));
  const existingIds = new Set(elements.map((el) => el.id));

  return [
    ...elements.map((el) => nextById.get(el.id) ?? el),
    ...next.filter((el) => !existingIds.has(el.id)),
  ];
}

export function updateElementsByIds(
  elements: SketchElement[],
  selectedIds: Set<string>,
  updates: Partial<SketchElement>,
): SketchElement[] {
  return elements.map((el) =>
    selectedIds.has(el.id)
      ? {
          ...el,
          ...updates,
        }
      : el,
  );
}

export function deleteElementsByIds(
  elements: SketchElement[],
  selectedIds: Set<string>,
): SketchElement[] {
  return elements.filter((el) => !selectedIds.has(el.id));
}

export function duplicateElements(
  elements: SketchElement[],
  offset: number,
): SketchElement[] {
  return cloneElementsForPaste(elements, offset);
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

function remapBinding(
  binding: SketchElement["startBinding"],
  idMap: Map<string, string>,
): SketchElement["startBinding"] {
  if (!binding) return undefined;

  const nextElementId = idMap.get(binding.elementId);

  if (!nextElementId) return undefined;

  return {
    ...binding,
    elementId: nextElementId,
  };
}

export function cloneElementsForPaste(
  elements: SketchElement[],
  offset: number | Point,
): SketchElement[] {
  const offsetX = typeof offset === "number" ? offset : offset.x;
  const offsetY = typeof offset === "number" ? offset : offset.y;
  const idMap = new Map(elements.map((element) => [element.id, randomId()]));

  return elements.map((element) => ({
    ...element,
    id: idMap.get(element.id)!,
    x1: element.x1 + offsetX,
    y1: element.y1 + offsetY,
    x2: element.x2 + offsetX,
    y2: element.y2 + offsetY,
    seed: Math.floor(Math.random() * 100_000),

    points: element.points?.map((point) => ({
      x: point.x + offsetX,
      y: point.y + offsetY,
    })),

    startBinding: remapBinding(element.startBinding, idMap),

    endBinding: remapBinding(element.endBinding, idMap),
  }));
}
