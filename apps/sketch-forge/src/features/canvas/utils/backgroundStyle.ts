import type { CSSProperties } from "react";
import type { CanvasBackground } from "../types";

/**
 * Renders the infinite paper/grid/dot background in CSS so panning and zooming
 * do not force full canvas redraws.
 */
export function getBackgroundStyle(
  bg: CanvasBackground,
  zoom: number,
  pan: { x: number; y: number },
  backgroundColor: string,
  gridColor: string,
  dotColor: string,
): CSSProperties {
  const base = { backgroundColor };
  const size = 10 * zoom;
  const posX = pan.x % size;
  const posY = pan.y % size;
  const dotSize = 20 * zoom;

  if (bg === "dots") {
    return {
      ...base,
      backgroundImage: `radial-gradient(circle, ${dotColor} 1.5px, transparent 1.5px)`,
      backgroundSize: `${dotSize}px ${dotSize}px`,
      backgroundPosition: `${posX}px ${posY}px`,
    };
  }

  if (bg === "grid") {
    return {
      ...base,
      backgroundImage: `
      linear-gradient(${gridColor} 1px, transparent 1px),
      linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
    `,
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: `${posX}px ${posY}px`,
    };
  }

  return base;
}
