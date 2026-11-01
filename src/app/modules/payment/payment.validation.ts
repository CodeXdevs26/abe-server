import { z } from "zod";

const AddressSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  email: z.string().email(),
  house: z.string().optional(),
  house_no: z.string().optional(),
  name: z.string(),
  phone: z.string().optional(),
  state: z.string().optional(),
  street_address: z.string().optional(),
  zip_code: z.string().optional(),
  address: z.string().optional(),
  location_coordinates: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
});

const ItemSchema = z.object({
  amount: z.number(),
  name: z.string(),
  product: z.string(),
  quantity: z.number().min(1),
  shipping_fee: z.number().optional(),
  store: z.string(),
  discount: z.number().optional(),
});

export const orderDataSchema = z
  .object({
    billing_address: AddressSchema.optional(),
    shipping_address: AddressSchema.optional(),
    items: z.array(ItemSchema),
    payment_method: z.enum(["cash", "stripe", "other"]).optional(),
    pointsToRedeem: z.number().optional(),
    fulfillment_type: z.enum(["delivery", "pickup", "dine_in"]).optional(),
  })
  .superRefine((data, ctx) => {
    const fulfillmentType = data.fulfillment_type || "delivery";

    if (fulfillmentType !== "delivery") {
      return;
    }

    const shippingAddress = data.shipping_address;
    const hasStructuredShippingAddress = !!(
      shippingAddress?.country ||
      shippingAddress?.state ||
      shippingAddress?.city ||
      shippingAddress?.zip_code ||
      shippingAddress?.street_address ||
      shippingAddress?.house ||
      shippingAddress?.house_no
    );
    const hasCoordinates =
      typeof shippingAddress?.location_coordinates?.latitude === "number" &&
      typeof shippingAddress?.location_coordinates?.longitude === "number";

    if (!shippingAddress || (!shippingAddress.address && !hasStructuredShippingAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shipping_address"],
        message: "Shipping address is required for delivery orders",
      });
    }

    if (!hasCoordinates) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shipping_address", "location_coordinates"],
        message:
          "Shipping address coordinates are required for delivery orders",
      });
    }
  });
