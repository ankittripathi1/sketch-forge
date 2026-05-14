import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
});

export const registerSchema = z.object({
  email: z.email(),
  name: z.string().min(3),
  avatarUrl: z.string().optional(),
});
