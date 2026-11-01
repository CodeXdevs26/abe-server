import { z } from "zod";

// Zod schema
const billingValidationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  company_name: z.string().trim().optional(),
  street_address: z.string().trim().optional(),
  country: z.string().trim().optional(),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  zip_code: z.string().trim().optional(),
  house_no: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .min(1, "Email is required"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
});

export default billingValidationSchema;