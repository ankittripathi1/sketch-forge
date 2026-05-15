import { z } from "zod";

// Reorder Schema
export const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().optional(),
      pageOrder: z.number().int().optional(),
    }),
  ),
});

// Review Schema
export const reviewPageSchema = z.object({
  quality: z.number().int().min(0).max(5),
});

export type ReorderItems = z.infer<typeof reorderSchema>;
export type ReviewPage = z.infer<typeof reviewPageSchema>;
