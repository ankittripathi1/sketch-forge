import type { SketchElement } from "@repo/element/types";

export type LayoutUpdate = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
};

/**
 * Merge a batch of layout updates into an element list. Coordinates are
 * always applied; text-only fields (text, fontSize, fontWeight) are gated
 * on `el.tool === "text"` so shapes never gain font fields by accident.
 */
export function applyLayoutUpdates(
  list: SketchElement[],
  updateMap: Map<string, LayoutUpdate>,
): SketchElement[] {
  return list.map((el) => {
    const u = updateMap.get(el.id);
    if (!u) return el;
    return {
      ...el,
      x1: u.x1,
      y1: u.y1,
      x2: u.x2,
      y2: u.y2,
      ...(u.text !== undefined && el.tool === "text" ? { text: u.text } : {}),
      ...(u.fontSize !== undefined && el.tool === "text"
        ? { fontSize: u.fontSize }
        : {}),
      ...(u.fontWeight !== undefined && el.tool === "text"
        ? { fontWeight: u.fontWeight }
        : {}),
    };
  });
}
