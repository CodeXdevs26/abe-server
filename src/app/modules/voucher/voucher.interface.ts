import { Types } from "mongoose";

export type TVoucherStatus = "generated" | "used" | "expired";

export type TVoucher = {
  order: Types.ObjectId;
  code: string;
  barcode_url?: string;
  status: TVoucherStatus;
  expires_at: Date;
  used_at?: Date;
  is_deleted: boolean;
};