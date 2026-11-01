import mongoose, { Schema } from "mongoose";
import {
  defaultProfileImg,
} from "../../constants/global.constant";
import { TRider } from "./rider.interface";

const riderSchema = new Schema<TRider>(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, required: false, default: defaultProfileImg },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    balance: { type: Number, default: 0 },
    location: { type: String, required: false, default: null },
    location_coordinates: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
        required: false,
      },
    },
    contact: { type: String, trim: true, default: null },
    driving_license: { type: String, required: true, trim: true },
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
    is_approved: { type: Boolean, required: true, default: false },
    is_blocked: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

riderSchema.index({ location_coordinates: "2dsphere" });

const RiderModel = mongoose.model<TRider>("Rider", riderSchema);
export default RiderModel;
