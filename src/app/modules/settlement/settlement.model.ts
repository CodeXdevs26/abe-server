import { model, Schema } from "mongoose";
import { TSettlement } from "./settlement.interface";

const transferStatusValues = [
  "not_applicable",
  "pending",
  "transferred",
  "failed",
];

const settlementSchema = new Schema<TSettlement>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    order_id: { type: String, required: true, trim: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: false,
      default: null,
    },
    rider: {
      type: Schema.Types.ObjectId,
      ref: "Rider",
      required: false,
      default: null,
    },
    currency: { type: String, required: true, trim: true, default: "usd" },
    subtotal: { type: Number, required: true, default: 0 },
    shipping_fee: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    service_fee: { type: Number, required: true, default: 0 },
    platform_order_commission_rate: {
      type: Number,
      required: true,
      default: 0,
    },
    rider_delivery_commission_rate: {
      type: Number,
      required: true,
      default: 0,
    },
    platform_order_commission: { type: Number, required: true, default: 0 },
    platform_service_fee: { type: Number, required: true, default: 0 },
    vendor_gross: { type: Number, required: true, default: 0 },
    vendor_net: { type: Number, required: true, default: 0 },
    rider_gross: { type: Number, required: true, default: 0 },
    rider_commission: { type: Number, required: true, default: 0 },
    rider_net: { type: Number, required: true, default: 0 },
    vendor_stripe_transfer_id: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    rider_stripe_transfer_id: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    vendor_transfer_error: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    rider_transfer_error: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    vendor_transfer_status: {
      type: String,
      enum: transferStatusValues,
      required: true,
      default: "pending",
    },
    rider_transfer_status: {
      type: String,
      enum: transferStatusValues,
      required: true,
      default: "not_applicable",
    },
  },
  { timestamps: true },
);

settlementSchema.index({ vendor: 1, createdAt: -1 });
settlementSchema.index({ rider: 1, createdAt: -1 });
settlementSchema.index({ store: 1, createdAt: -1 });

const SettlementModel = model<TSettlement>("Settlement", settlementSchema);

export default SettlementModel;
