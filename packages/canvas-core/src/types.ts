export type Tool = "rectangle" | "ellipse" | "line" | "freehand";

export type Point = { x: number; y: number };

export type DrawingElement = {
  id: string;
  tool: Tool;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points?: Point[];
};
