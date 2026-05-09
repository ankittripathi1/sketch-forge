export type Tool = "rectangle" | "ellipse" | "line" | "freehand" | "eraser";
export type FillStyle = "none" | "hachure" | "solid";
export type Point = { x: number; y: number };

export type SketchElement = {
  id: string;
  tool: Tool;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  seed: number;
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  points?: Point[];
};
