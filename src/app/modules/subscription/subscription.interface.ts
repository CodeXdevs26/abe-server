import { Types } from "mongoose";

export type TSubscriptionRole = "broker" | "rider" | "vendor";

export type TSubscriptionStatus =
  | "inactive"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export type TSubscription = {
  email: string;
  role: TSubscriptionRole;
  owner_id: Types.ObjectId;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  stripe_product_id?: string | null;
  stripe_checkout_session_id?: string | null;
  status: TSubscriptionStatus;
  current_period_start?: Date | null;
  current_period_end?: Date | null;
  cancel_at_period_end: boolean;
  is_deleted: boolean;
};
