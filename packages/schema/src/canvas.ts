import { z } from "zod";

export const ToolSchema = z.enum([
  "rectangle",
  "ellipse",
  "line",
  "freehand",
  "highlighter",
  "eraser",
]);

export type Tool = z.infer<typeof ToolSchema>;

export const FillStyleSchema = z.enum(["none", "hachure", "solid"]);
export type FillStyle = z.infer<typeof FillStyleSchema>;

export const PointSchema = z.object({ x: z.number(), y: z.number() });
export type Point = z.infer<typeof PointSchema>;

export const SketchElementSchema = z.object({
  id: z.string(),
  tool: ToolSchema,
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  seed: z.number(),
  strokeColor: z.string(),
  fillColor: z.string(),
  fillStyle: FillStyleSchema,
  strokeWidth: z.number(),
  opacity: z.number().optional(),
  text: z.string().optional(),
  points: z.array(PointSchema).optional(),
  src: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
});
export type SketchElement = z.infer<typeof SketchElementSchema>;

export const CreateCanvasSchema = z.object({
  title: z.string().min(1).optional(),
  elements: z.array(SketchElementSchema).optional(),
});

export const UpdateCanvasSchema = z.object({
  title: z.string().min(1).optional(),
  elements: z.array(SketchElementSchema).optional(),
  thumbnail: z.string().optional(),
});
