import { z } from "zod";
import { SketchElementSchema } from "./canvas.js";

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  elements: z.array(SketchElementSchema),
  thumbnail: z.string().optional().nullable(),
  folderId: z.string().uuid().optional().nullable(),
  isSystem: z.boolean().optional().default(false),
});

export const UpdateTemplateSchema = CreateTemplateSchema.partial();

export const ApplyTemplateSchema = z.object({
  folderId: z.string().uuid().optional().nullable(),
  title: z.string().optional(),
});

export type CreateTemplate = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplate = z.infer<typeof UpdateTemplateSchema>;
export type ApplyTemplate = z.infer<typeof ApplyTemplateSchema>;
