import { z } from 'zod';

const createReviewValidationSchema = z.object({
  stars: z.number().min(1, "Minimum rating is 1").max(5, "Maximum rating is 5"),
  text: z.string().trim().optional(),
  product: z.string().min(1, "Product reference is required"), // Reference to Product
});

export default createReviewValidationSchema;