import mongoose, { Schema } from "mongoose";
import {
  defaultProfileImg,
} from "../../constants/global.constant";
import { TRewardPoint, TUser } from "./user.interface";
import {
  FIRST_RESPONDER_STATUSES,
  FIRST_RESPONDER_TYPES,
} from "../../constants/firstResponder.constant";

const RewardPointSchema = new Schema<TRewardPoint>(
  {
    points: { type: Number, required: true },
    remainingPoints: { type: Number, required: true },
    earnedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new Schema<TUser>(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, required: false, default: defaultProfileImg },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    location: { type: String, required: false, default: null },
    contact: { type: String, trim: true, default: null },
    document: { type: String, required: false, default: null },
    first_responder_type: {
      type: String,
      enum: FIRST_RESPONDER_TYPES,
      required: false,
      default: null,
    },
    first_responder_status: {
      type: String,
      enum: FIRST_RESPONDER_STATUSES,
      default: "not_requested",
    },
    is_approved: { type: Boolean, default: false },
    is_blocked: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false },
    rewardPoints: { type: [RewardPointSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

const UserModel = mongoose.model<TUser>("User", userSchema);
export default UserModel;
