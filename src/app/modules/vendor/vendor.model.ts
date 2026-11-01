import mongoose, { Schema } from "mongoose";
import { TVendor } from "./vendor.interface";

const vendorSchema = new Schema<TVendor>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    contact: {
      type: String,
      trim: true,
      default: null,
    },
    store: {
      type: mongoose.Types.ObjectId,
      ref: "Store",
      trim: true,
      required: true,
    },
    tax_document: {
      type: String,
      required: true,
      trim: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    broker_referral: {
      type: String,
      trim: true,
      default: null,
    },
    stripe_connect_account_id: {
      type: String,
      trim: true,
      default: null,
    },
    stripe_connect_onboarding_completed: {
      type: Boolean,
      default: false,
    },
    stripe_connect_charges_enabled: {
      type: Boolean,
      default: false,
    },
    stripe_connect_payouts_enabled: {
      type: Boolean,
      default: false,
    },
    is_approved: {
      type: Boolean,
      default: false,
    },
    is_blocked: {
      type: Boolean,
      default: false,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const VendorModel = mongoose.model<TVendor>("Vendor", vendorSchema);
export default VendorModel;
