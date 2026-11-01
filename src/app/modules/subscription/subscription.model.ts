import mongoose, { Schema } from "mongoose";
import { TSubscription } from "./subscription.interface";

const subscriptionSchema = new Schema<TSubscription>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ["broker", "rider", "vendor"],
      required: true,
    },
    owner_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    stripe_customer_id: {
      type: String,
      default: null,
    },
    stripe_subscription_id: {
      type: String,
      default: null,
    },
    stripe_price_id: {
      type: String,
      default: null,
    },
    stripe_product_id: {
      type: String,
      default: null,
    },
    stripe_checkout_session_id: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      default: "inactive",
    },
    current_period_start: {
      type: Date,
      default: null,
    },
    current_period_end: {
      type: Date,
      default: null,
    },
    cancel_at_period_end: {
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

subscriptionSchema.index({ email: 1, role: 1 }, { unique: true });
subscriptionSchema.index({ stripe_subscription_id: 1 }, { sparse: true });

const SubscriptionModel = mongoose.model<TSubscription>(
  "Subscription",
  subscriptionSchema,
);

export default SubscriptionModel;
