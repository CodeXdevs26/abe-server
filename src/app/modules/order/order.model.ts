import { model, Schema } from "mongoose";
import { TOrder } from "./order.interface";

const OrderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },
  discount: { type: Number, required: false, default: 0 },
});

const orderSchema = new Schema<TOrder>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    order_id: { type: String, required: true, unique: true },
    payment_method: {
      type: String,
      enum: ["stripe", "cash"],
      required: true,
      trim: true,
    },
    subtotal: { type: Number, required: true },
    shipping_fee: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ["received", "processing", "ongoing", "delivered", "canceled"],
      default: "received",
    },
    payment_status: {
      type: String,
      required: true,
      enum: ["paid", "unpaid", "pending"],
    },
    items: [OrderItemSchema],
    billing_address: {
      type: Schema.Types.ObjectId,
      ref: "Billing",
      required: false,
    },
    shipping_address: {
      type: Schema.Types.ObjectId,
      ref: "Shipping",
      required: false,
    },
    fulfillment_type: {
      type: String,
      enum: ["delivery", "pickup", "dine_in"],
      required: true,
      default: "delivery",
    },
    voucher: {
      type: Schema.Types.ObjectId,
      ref: "Voucher",
      required: false,
    },
    pickupRequest: {
      type: Schema.Types.ObjectId,
      ref: "PickupRequest",
      required: false,
    },
    first_responder_type: {
      type: String,
      required: false,
      default: null,
    },
    first_responder_discount_percentage: {
      type: Number,
      required: false,
      default: 0,
    },
    reward_points_discount_percentage: {
      type: Number,
      required: false,
      default: 0,
    },
    applied_discount_percentage: {
      type: Number,
      required: false,
      default: 0,
    },
    stripe_checkout_session_id: {
      type: String,
      required: false,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

orderSchema.index(
  { stripe_checkout_session_id: 1, store: 1 },
  {
    unique: true,
    partialFilterExpression: {
      stripe_checkout_session_id: { $type: "string" },
    },
  },
);

const OrderModel = model<TOrder>("Order", orderSchema);

export default OrderModel;
