import { Types } from "mongoose";

export type TSettlementTransferStatus =
  | "not_applicable"
  | "pending"
  | "transferred"
  | "failed";

export type TSettlement = {
  order: Types.ObjectId;
  order_id: string;
  customer: Types.ObjectId;
  store: Types.ObjectId;
  vendor?: Types.ObjectId | null;
  rider?: Types.ObjectId | null;
  currency: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  service_fee: number;
  platform_order_commission_rate: number;
  rider_delivery_commission_rate: number;
  platform_order_commission: number;
  platform_service_fee: number;
  vendor_gross: number;
  vendor_net: number;
  rider_gross: number;
  rider_commission: number;
  rider_net: number;
  vendor_stripe_transfer_id?: string | null;
  rider_stripe_transfer_id?: string | null;
  vendor_transfer_error?: string | null;
  rider_transfer_error?: string | null;
  vendor_transfer_status: TSettlementTransferStatus;
  rider_transfer_status: TSettlementTransferStatus;
  createdAt?: Date;
  updatedAt?: Date;
};
