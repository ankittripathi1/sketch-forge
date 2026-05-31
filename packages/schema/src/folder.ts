import { z } from "zod";

export const CreateFolderSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255),
  icon: z.string().optional().nullable(),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional()
    .nullable(),
  sortOrder: z.number().int().optional(),
});

export const UpdateFolderSchema = CreateFolderSchema.partial();

export type CreateFolder = z.infer<typeof CreateFolderSchema>;
export type UpdateFolder = z.infer<typeof UpdateFolderSchema>;
