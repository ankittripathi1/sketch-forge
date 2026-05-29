/** Drawing tool identifier. 'select', 'text', and 'image' are canvas-only. */
export type Tool =
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "freehand"
  | "highlighter"
  | "eraser"
  | "text"
  | "image"
  | "select";

/** Fill rendering mode for closed shapes. */
export type FillStyle = "none" | "hachure" | "solid";

/** Horizontal placement of inline text inside a shape. */
export type TextAlign = "left" | "center" | "right";
/** Vertical placement of inline text inside a shape. */
export type TextVerticalAlign = "top" | "middle" | "bottom";

/** 2-D point in canvas coordinate space. */
export type Point = { x: number; y: number };

/** Which side of a shape an arrow endpoint snaps to. */
export type AnchorSide = "top" | "right" | "bottom" | "left";

/** Reference from an arrow endpoint to a shape it is anchored to. */
export type ArrowBinding = { elementId: string; anchor: AnchorSide };

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
  /** Horizontal text alignment for inline shape labels. Default: center. */
  textAlign?: TextAlign;
  /** Vertical text alignment for inline shape labels. Default: middle. */
  textVerticalAlign?: TextVerticalAlign;
  /** Arrow start endpoint binding to another element. */
  startBinding?: ArrowBinding;
  /** Arrow end endpoint binding to another element. */
  endBinding?: ArrowBinding;
  /**
   * Perpendicular offset (in canvas units) of the curve's control point from
   * the midpoint of the line between the two endpoints. 0 / undefined renders
   * a straight arrow; any other value renders a quadratic bezier.
   */
  bend?: number;
};
