/** Drawing tool identifier. 'select', 'text', and 'image' are canvas-only. */
export type Tool =
  | "rectangle"
  | "ellipse"
  | "line"
  | "freehand"
  | "highlighter"
  | "eraser"
  | "text"
  | "image"
  | "select";

/** Fill rendering mode for closed shapes. */
export type FillStyle = "none" | "hachure" | "solid";

/** 2-D point in canvas coordinate space. */
export type Point = { x: number; y: number };

/** A single drawable element on the canvas. */
export type SketchElement = {
  id: string;
  tool: Tool;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Seed for roughjs — keeps strokes deterministic across re-renders. */
  seed: number;
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  /** 0–1 alpha, used by the highlighter tool. */
  opacity?: number;
  /** Text content for tool="text" or inline shape labels. */
  text?: string;
  /** Ordered path points for freehand and highlighter strokes. */
  points?: Point[];
  /** Data URL for tool="image". */
  src?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
};
