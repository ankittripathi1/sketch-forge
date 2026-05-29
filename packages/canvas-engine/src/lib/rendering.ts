import type { RefObject } from "react";
import rough from "roughjs";
import type {
  AnchorSide,
  Point,
  SketchElement,
} from "@repo/canvas-core/types";
import {
  drawElement,
  drawSelectionBox,
  drawAnchorHints,
} from "@repo/canvas-core/renderElement";
import { applyTransform, clearCanvas } from "./transform";

export type RenderContext = {
  sceneCanvas: RefObject<HTMLCanvasElement | null>;
  interactionCanvas: RefObject<HTMLCanvasElement | null>;
  elements: RefObject<SketchElement[]>;
  selectedIds: RefObject<Set<string>>;
  currentElement: RefObject<SketchElement | null>;
  hoveredAnchor: RefObject<{
    shape: SketchElement;
    anchor: AnchorSide;
  } | null>;
  selectionMarquee: RefObject<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>;
  zoom: RefObject<number>;
  panOffset: RefObject<Point>;
  viewportRafId: RefObject<number>;
  setPanOffsetDisplay: (p: Point) => void;
};

export function createRenderers(ctx: RenderContext) {
  function renderScene() {
    const canvas = ctx.sceneCanvas.current;
    if (!canvas) return;
    const c2d = canvas.getContext("2d")!;
    clearCanvas(canvas);
    c2d.save();
    applyTransform(c2d, canvas, ctx.zoom.current!, ctx.panOffset.current!);
    const rc = rough.canvas(canvas);
    const all = [...(ctx.elements.current ?? [])];
    all.forEach((el) => drawElement(rc, el, renderScene, all));
    c2d.restore();
  }

  function renderActiveElement() {
    const canvas = ctx.interactionCanvas.current;
    if (!canvas) return;
    const c2d = canvas.getContext("2d")!;
    clearCanvas(canvas);
    if (!ctx.currentElement.current && !ctx.hoveredAnchor.current) return;
    c2d.save();
    applyTransform(c2d, canvas, ctx.zoom.current!, ctx.panOffset.current!);
    if (ctx.currentElement.current) {
      const rc = rough.canvas(canvas);
      drawElement(rc, ctx.currentElement.current, undefined, [
        ...(ctx.elements.current ?? []),
      ]);
    }
    if (ctx.hoveredAnchor.current) {
      drawAnchorHints(
        c2d,
        ctx.hoveredAnchor.current.shape,
        ctx.hoveredAnchor.current.anchor,
        ctx.zoom.current!,
      );
    }
    c2d.restore();
  }

  function renderSelection() {
    const canvas = ctx.interactionCanvas.current;
    if (!canvas) return;
    const c2d = canvas.getContext("2d")!;
    clearCanvas(canvas);

    c2d.save();
    applyTransform(c2d, canvas, ctx.zoom.current!, ctx.panOffset.current!);
    const rc = rough.canvas(canvas);

    if (ctx.selectionMarquee.current) {
      const { x1, y1, x2, y2 } = ctx.selectionMarquee.current;
      const z = ctx.zoom.current!;
      c2d.strokeStyle = "#6366f1";
      c2d.setLineDash([5 / z, 3 / z]);
      c2d.lineWidth = 1 / z;
      c2d.strokeRect(
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.abs(x2 - x1),
        Math.abs(y2 - y1),
      );
      c2d.fillStyle = "rgba(99, 102, 241, 0.05)";
      c2d.fillRect(
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.abs(x2 - x1),
        Math.abs(y2 - y1),
      );
    }

    const all = [...(ctx.elements.current ?? [])];
    const selected = all.filter((el) => ctx.selectedIds.current.has(el.id));
    selected.forEach((el) => {
      drawElement(rc, el, undefined, all);
      drawSelectionBox(c2d, el, ctx.zoom.current!, all);
    });

    if (ctx.hoveredAnchor.current) {
      drawAnchorHints(
        c2d,
        ctx.hoveredAnchor.current.shape,
        ctx.hoveredAnchor.current.anchor,
        ctx.zoom.current!,
      );
    }

    c2d.restore();
  }

  function renderInteractionLayer() {
    if (
      ctx.selectedIds.current.size > 0 ||
      ctx.selectionMarquee.current
    ) {
      renderSelection();
      return;
    }
    renderActiveElement();
  }

  function scheduleViewportRender() {
    cancelAnimationFrame(ctx.viewportRafId.current!);
    (ctx.viewportRafId as { current: number }).current = requestAnimationFrame(
      () => {
        ctx.setPanOffsetDisplay({ ...ctx.panOffset.current! });
        renderScene();
        renderInteractionLayer();
      },
    );
  }

  return {
    renderScene,
    renderActiveElement,
    renderSelection,
    renderInteractionLayer,
    scheduleViewportRender,
  };
}
