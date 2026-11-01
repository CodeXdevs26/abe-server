import mongoose, { Schema } from "mongoose";
import { TAuth } from "./auth.interface";

const userSchema = new Schema<TAuth>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "vendor", "rider", "broker", "admin"],
      default: "user",
      required: true,
    },
    is_approved: { type: Boolean, default: false },
    is_email_verified: { type: Boolean, default: false },
    otp: { type: String, trim: true },
    otp_expires: { type: Date },
    otp_attempts: { type: Number, default: undefined },
    is_otp_verified: { type: Boolean, default: undefined },
    is_deleted: { type: Boolean, default: false },
    is_blocked: { type: Boolean, default: false },
    free_trial_end_date: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

const AuthModel = mongoose.model<TAuth>("Auth", userSchema);
export default AuthModel;
