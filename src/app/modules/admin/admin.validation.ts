import { z } from "zod";

const updateAdminValidationSchema = z.object({
  name: z.string({ error: "Name must be a string!" }).optional(),
  phone: z.string({ error: "Phone number must be a string!" }).optional(),
});

export default updateAdminValidationSchema;
