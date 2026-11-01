import { z } from "zod";

export const pickupRequestValidationSchema = z.object({
  order: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId'),
});

export const updateStatusValidationSchema = z.object({
  status: z.enum(['ongoing', 'delivered', 'canceled']),
}).or(
  z
    .object({
      fields: z.union([
        z.array(
          z.object({
            key: z.string(),
            value: z.string(),
          }),
        ),
        z.string(),
      ]),
    })
    .transform((body) => {
      const fields =
        typeof body.fields === "string" ? JSON.parse(body.fields) : body.fields;
      const statusField = fields.find((field: any) => field?.key === "status");

      return {
        status: statusField?.value,
      };
    })
    .pipe(
      z.object({
        status: z.enum(['ongoing', 'delivered', 'canceled']),
      }),
    ),
);
