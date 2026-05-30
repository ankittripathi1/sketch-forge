import type { SketchElement } from "./types";
import { DEFAULT_DARK_STROKE, DEFAULT_LIGHT_STROKE } from "@repo/common";

export type RecolorResult = {
  elements: SketchElement[];
  selected: SketchElement[];
  changed: boolean;
  newDefaultStroke: string;
};

export function recolorByTheme(
  elements: SketchElement[],
  selected: SketchElement[],
  isDark: boolean,
): RecolorResult {
  const fromColor = isDark ? DEFAULT_LIGHT_STROKE : DEFAULT_DARK_STROKE;
  const toColor = isDark ? DEFAULT_DARK_STROKE : DEFAULT_LIGHT_STROKE;

  const recolor = (el: SketchElement): SketchElement =>
    el.strokeColor.toLowerCase() === fromColor.toLowerCase()
      ? { ...el, strokeColor: toColor }
      : el;

  const nextElements = elements.map(recolor);
  const nextSelected = selected.map(recolor);

  const changed =
    nextElements.some((el, i) => el !== elements[i]) ||
    nextSelected.some((el, i) => el !== selected[i]);

  return {
    elements: nextElements,
    selected: nextSelected,
    changed,
    newDefaultStroke: toColor,
  };
}
