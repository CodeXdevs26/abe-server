import { z } from 'zod';

const createCartValidationSchema = z.object({
  product: z.string().min(1, "Product reference is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

export default createCartValidationSchema;