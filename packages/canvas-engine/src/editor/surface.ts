/**
 * The two canvases the editor draws on.
 *
 * Getters rather than values: in React these are backed by refs that are still
 * `null` on the first render, and the editor is constructed before they attach.
 * Anything reading a canvas must therefore cope with `null` on every call, not
 * just at construction.
 *
 * Two adapters justify this seam: the DOM canvases in the app, and a fake in
 * tests that never paints.
 */
export type Surface = {
  scene: () => HTMLCanvasElement | null;
  interaction: () => HTMLCanvasElement | null;
};

/** A `Surface` that has no canvases. Used by tests and before refs attach. */
export function createNullSurface(): Surface {
  return {
    scene: () => null,
    interaction: () => null,
  };
}
