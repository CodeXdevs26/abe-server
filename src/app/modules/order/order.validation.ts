import { z } from 'zod';
import billingValidationSchema from '../billing/billing.validation';
import shippingValidationSchema from '../shipping/shipping.validation';

export const orderItemValidationSchema = z.object({
  product: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  amount: z.number().optional(),
  shipping_fee: z.number().optional(),
  store: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format').optional(),
  discount: z.number().optional(),
});

export const createOrderValidationSchema = z
  .object({
    subtotal: z.number().positive('Subtotal must be a positive number'),
    store: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format'),
    shipping_fee: z.number().optional(),
    total: z.number().positive('Total must be a positive number'),
    payment_status: z.enum(['paid', 'unpaid']).optional(),
    items: z.array(orderItemValidationSchema).min(1, 'At least one item is required'),
    billing_address: billingValidationSchema.optional(),
    shipping_address: shippingValidationSchema.optional(),
    fulfillment_type: z.enum(['delivery', 'pickup', 'dine_in']).optional(),
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
