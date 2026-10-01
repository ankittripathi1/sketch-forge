import rough from "roughjs";
import {
  drawElement,
  drawGroupSelectionBox,
  drawSelectionMarquee,
  drawSelectionBox,
  drawAnchorHints,
} from "@repo/canvas-core/renderElement";
import { applyTransform, clearCanvas, getDeviceScale } from "./transform";
import { getBoundingBox } from "@repo/element/bounds";
import type { CanvasFrameState } from "../editor/frameState";
import type { Surface } from "../editor/surface";
import type { Point, SketchElement } from "@repo/element/types";

type WorldRect = { left: number; top: number; right: number; bottom: number };

/** The world-space rectangle currently visible on `canvas`. */
function visibleWorldRect(
  canvas: HTMLCanvasElement,
  zoom: number,
  panOffset: Point,
): WorldRect {
  const scale = getDeviceScale(canvas);
  const cssWidth = canvas.width / scale;
  const cssHeight = canvas.height / scale;
  return {
    left: -panOffset.x / zoom,
    top: -panOffset.y / zoom,
    right: (cssWidth - panOffset.x) / zoom,
    bottom: (cssHeight - panOffset.y) / zoom,
  };
}

/**
 * True when the element could paint inside `view`. Padded by the stroke width
 * plus a little slack for RoughJS overshoot, so nothing pops in at the edge.
 */
function intersectsViewport(el: SketchElement, view: WorldRect): boolean {
  const b = getBoundingBox(el);
  const pad = (el.strokeWidth ?? 2) + 8;
  return (
    b.x - pad <= view.right &&
    b.x + b.w + pad >= view.left &&
    b.y - pad <= view.bottom &&
    b.y + b.h + pad >= view.top
  );
}

export type RenderContext = {
  surface: Surface;
  frame: CanvasFrameState;
  selectedIds: () => ReadonlySet<string>;
  setPanOffsetDisplay: (point: Point) => void;
};

/**
 * Painting for the two canvases.
 *
 * Reads frame state directly rather than through a context of refs, so a change
 * to what is on screen cannot go stale behind a copy. The `schedule*` variants
 * coalesce to one animation frame, which is what a drag actually needs.
 */
export function createRenderers(ctx: RenderContext) {
  const { frame } = ctx;

  function renderScene() {
    const canvas = ctx.surface.scene();
    if (!canvas) return;
    const c2d = canvas.getContext("2d")!;
    clearCanvas(canvas);
    c2d.save();
    applyTransform(c2d, canvas, frame.zoom, frame.panOffset);
    const rc = rough.canvas(canvas);
    const all = [...frame.elements];
    // Draw only what the viewport can show. `all` still goes to drawElement so
    // bindings that point at an off-screen shape keep resolving.
    const view = visibleWorldRect(canvas, frame.zoom, frame.panOffset);
    all
      .filter((el) => intersectsViewport(el, view))
      .forEach((el) => drawElement(rc, el, renderScene, all));
    c2d.restore();
  }

  function renderActiveElement() {
    const canvas = ctx.surface.interaction();
    if (!canvas) return;
    const c2d = canvas.getContext("2d")!;
    clearCanvas(canvas);
    if (!frame.currentElement && !frame.hoveredAnchor) return;
    c2d.save();
    applyTransform(c2d, canvas, frame.zoom, frame.panOffset);
    if (frame.currentElement) {
      const rc = rough.canvas(canvas);
      drawElement(rc, frame.currentElement, undefined, [...frame.elements]);
    }
    if (frame.hoveredAnchor) {
      drawAnchorHints(
        c2d,
        frame.hoveredAnchor.shape,
        frame.hoveredAnchor.anchor,
        frame.zoom,
      );
    }
    c2d.restore();
  }

  function renderSelection() {
    const canvas = ctx.surface.interaction();
    if (!canvas) return;
    const c2d = canvas.getContext("2d")!;
    clearCanvas(canvas);

    c2d.save();
    applyTransform(c2d, canvas, frame.zoom, frame.panOffset);
    const rc = rough.canvas(canvas);

    if (frame.selectionMarquee) {
      const { x1, y1, x2, y2 } = frame.selectionMarquee;
      drawSelectionMarquee(c2d, x1, y1, x2, y2, frame.zoom);
    }

    const all = [...frame.elements];
    const selectedIds = ctx.selectedIds();
    const selected = all.filter((el) => selectedIds.has(el.id));
    selected.forEach((el) => {
      drawElement(rc, el, undefined, all);
    });
    if (selected.length === 1) {
      drawSelectionBox(c2d, selected[0]!, frame.zoom, all);
    } else if (selected.length > 1) {
      drawGroupSelectionBox(c2d, selected, frame.zoom);
    }

    if (frame.hoveredAnchor) {
      drawAnchorHints(
        c2d,
        frame.hoveredAnchor.shape,
        frame.hoveredAnchor.anchor,
        frame.zoom,
      );
    }

    c2d.restore();
  }

  function renderInteractionLayer() {
    if (ctx.selectedIds().size > 0 || frame.selectionMarquee) {
      renderSelection();
      return;
    }
    renderActiveElement();
  }

  function renderSceneAndSelection() {
    renderScene();
    renderSelection();
  }

  function scheduleViewportRender() {
    cancelAnimationFrame(frame.viewportRafId);
    frame.viewportRafId = requestAnimationFrame(() => {
      ctx.setPanOffsetDisplay({ ...frame.panOffset });
      renderScene();
      renderInteractionLayer();
    });
  }

  function scheduleInteractionRender(render: () => void) {
    cancelAnimationFrame(frame.interactionRafId);
    frame.interactionRafId = requestAnimationFrame(render);
  }

  return {
    renderScene,
    renderActiveElement,
    renderSelection,
    renderInteractionLayer,
    renderSceneAndSelection,
    scheduleSelectionRender: () => scheduleInteractionRender(renderSelection),
    scheduleActiveElementRender: () =>
      scheduleInteractionRender(renderActiveElement),
    scheduleSceneAndSelectionRender: () =>
      scheduleInteractionRender(renderSceneAndSelection),
    scheduleViewportRender,
  };
}
