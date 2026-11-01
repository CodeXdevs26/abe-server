import { z } from "zod";

const createBannerValidationSchema = z.object({
  image: z.string().optional(),
  index: z.number().optional(),
});

export const bannerValidations = {
  createBannerValidationSchema,
};