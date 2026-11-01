import { z } from "zod";

const locationSchema = z.object({
  coordinates: z.array(z.number()).min(2).max(2),
});

export const vendorSignupValidationSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z
    .string()
    .nonempty("Password is required")
    .min(7, "Password must be at least 7 characters long"),
  broker_referral: z.string().trim().optional().nullable(),
  store_name: z.string().trim().min(1, "Store name is required"),
  store_description: z.string().trim().min(1, "Store description is required"),
  contact: z.string().optional(),
  location: locationSchema,
});

export const vendorUpdateValidationSchema = z.object({
  store_name: z.string().trim().optional(),
  store_description: z.string().trim().optional(),
  contact: z.string().optional(),
  location: locationSchema.optional(),
  images_to_delete: z.array(z.string()).optional(),
  images_to_keep: z.array(z.string()).optional(),
});

export type TVendorSignUp = z.infer<typeof vendorSignupValidationSchema>;
