import type { SketchElement } from "@repo/element/types";

export type SketchScene = {
  elements: readonly SketchElement[];
  version: number;
};

export function createScene(
  elements: readonly SketchElement[] = [],
): SketchScene {
  return {
    elements,
    version: 0,
  };
}

export function getSceneElements(scene: SketchScene): readonly SketchElement[] {
  return scene.elements;
}

export function updateSceneElements(
  scene: SketchScene,
  elements: readonly SketchElement[],
): SketchScene {
  return {
    elements,
    version: scene.version + 1,
  };
}

export function cloneSceneElements(scene: SketchScene): SketchElement[] {
  return [...scene.elements];
}
