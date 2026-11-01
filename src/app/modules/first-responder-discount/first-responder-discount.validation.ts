import { z } from "zod";

const discountValue = z
  .number()
  .min(0, "Discount must be at least 0")
  .max(100, "Discount cannot be more than 100");

export const updateFirstResponderDiscountSchema = z.object({
  police_officer: discountValue.optional(),
  firefighter: discountValue.optional(),
  ems_paramedic: discountValue.optional(),
  active_military: discountValue.optional(),
  veteran: discountValue.optional(),
  nurse: discountValue.optional(),
  doctor: discountValue.optional(),
});