import { TFirstResponderType } from "../../constants/firstResponder.constant";
import { Types } from 'mongoose';

export type TOrderItem = {
  product: Types.ObjectId;
  quantity: number;
  discount?: number;
  amount?: number;
  shipping_fee?: number;
  store?: Types.ObjectId;
  name?: string;
}

export type TVoucherStatus = "generated" | "used" | "expired";

export type TOrder = {
  customer: Types.ObjectId;
  store: Types.ObjectId;
  order_id: string;
  payment_method: "stripe" | "cash";
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: 'received' | 'processing' | 'ongoing' | 'delivered' | 'canceled';
  payment_status: 'paid' | 'unpaid' | "pending";
  items: TOrderItem[];
  shipping_address?: Types.ObjectId;
  billing_address?: Types.ObjectId;
  fulfillment_type?: "delivery" | "pickup" | "dine_in";
  voucher?: Types.ObjectId;
  pickupRequest?: Types.ObjectId;
  pointsToRedeem?: number;
  first_responder_type?: TFirstResponderType | null;
  first_responder_discount_percentage?: number;
  reward_points_discount_percentage?: number;
  applied_discount_percentage?: number;
  stripe_checkout_session_id?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
