import { z } from "zod";
import { FIRST_RESPONDER_TYPES } from "../../constants/firstResponder.constant";

export const userSignUpValidationSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  image: z.string().optional(),
  email: z.string().trim().email("Invalid email format.").toLowerCase(),
  password: z
    .string()
    .nonempty("Password is required")
    .min(7, "Password must be at least 7 characters long"),
  location: z.string().nullable().optional(),
  contact: z.string().trim().nullable().optional(),
  document: z.string().nullable().optional(),
  first_responder_type: z.enum(FIRST_RESPONDER_TYPES).optional().nullable(),
});

export const updateUserValidationSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").optional(),
  image: z.string().optional(),
  location: z.string().nullable().optional(),
  contact: z.string().trim().nullable().optional(),
  document: z.string().nullable().optional(),
  first_responder_type: z.enum(FIRST_RESPONDER_TYPES).optional().nullable(),
});

export type TUserSignUp = z.infer<typeof userSignUpValidationSchema>;
