import { z } from "zod";

export const StoreValidationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  cover_image: z.string().optional(),
  location: z.string().trim().min(1, "Location is required"),
  description: z.string().trim().nullable().optional(),
  categories: z.array(z.string()).optional().default([])
});