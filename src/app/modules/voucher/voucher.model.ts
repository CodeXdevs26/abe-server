import mongoose, { Schema } from "mongoose";
import { TVoucher } from "./voucher.interface";

const voucherSchema = new Schema<TVoucher>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    barcode_url: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["generated", "used", "expired"],
      required: true,
      default: "generated",
    },
    expires_at: {
      type: Date,
      required: true,
    },
    used_at: {
      type: Date,
      default: null,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

voucherSchema.index({ code: 1 }, { unique: true });

export const VoucherModel = mongoose.model<TVoucher>("Voucher", voucherSchema);