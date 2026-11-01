import { z } from "zod";

export const riderSignupValidationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email().trim().toLowerCase(),
  password: z
    .string()
    .nonempty("Password is required")
    .min(7, "Password must be at least 7 characters long"),
  location: z.string().nullable().optional(),
  contact: z.string().trim().nullable().optional(),
});

export const updateRiderValidationSchema = z.object({
  name: z.string().trim().optional(),
  location: z.string().nullable().optional(),
  contact: z.string().trim().nullable().optional(),
});

export type TRiderSignup = z.infer<typeof riderSignupValidationSchema> & {
  role: "rider";
  image: string;
  driving_license: string;
};
