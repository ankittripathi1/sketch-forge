import { z } from "zod";
import { SketchElementSchema } from "./canvas.js";

export const PageStatusSchema = z.enum(["new", "learning", "mastered"]);

export const CreatePageSchema = z.object({
  folderId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(255).optional(),
  elements: z.array(SketchElementSchema).optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  status: PageStatusSchema.optional(),
  pageOrder: z.number().int().optional(),
  tags: z.array(z.string()).optional().nullable(),
});

export const UpdatePageSchema = CreatePageSchema.partial().extend({
  lastReviewedAt: z.coerce.date().optional().nullable(),
  nextReviewAt: z.coerce.date().optional().nullable(),
});

export type CreatePage = z.infer<typeof CreatePageSchema>;
export type UpdatePage = z.infer<typeof UpdatePageSchema>;
export type PageStatus = z.infer<typeof PageStatusSchema>;
