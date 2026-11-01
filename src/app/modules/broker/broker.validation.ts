import { z } from "zod";

export const brokerSignupValidationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email format"),
  password: z.string().nonempty("Password is required").min(7, "Password must be at least 7 characters long"),
  location: z.string().trim().min(1, "Location is required").optional(),
  contact: z.string().trim().optional(),
});

export const updateBrokerValidationSchema = z.object({
  name: z.string().trim().optional(),
  location: z.string().trim().optional(),
  contact: z.string().trim().optional(),
});

export type TBrokerSignup = z.infer<typeof brokerSignupValidationSchema>;