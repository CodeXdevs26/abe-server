import { z } from "zod";

export const createProductValidationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  price: z.number().min(0, "Price must be at least 0"),
  description: z.string().trim().optional(),
  quantity: z.number().min(0, "Quantity must be at least 0"),
  discount: z.number().min(0, "Discount must be at least 0").optional(),
});

export const updateProductValidationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  category: z.string().min(1, "Category is required").optional(),
  price: z.number().min(0, "Price must be at least 0").optional(),
  description: z.string().trim().optional(),
  quantity: z.number().min(0, "Quantity must be at least 0").optional(),
  oldImgsToKeep: z.array(z.string()).optional(),
  imagesToDelete: z.array(z.string()).optional(),
  discount: z.number().min(0, "Discount must be at least 0").optional(),
});
