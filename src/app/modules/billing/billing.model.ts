import { model, Schema, Types } from "mongoose";
import { TBilling } from "./billing.interface";

const billingSchema = new Schema<TBilling>({
  user: { type: Types.ObjectId, required: true, ref: 'User', trim: true },
  name: { type: String, required: true, trim: true },
  email: {
    type: String, required: true, trim: true
  },
  phone: {
    type: String, required: true, trim: true,
  },
  company_name: { type: String, default: null, trim: true },
  street_address: { type: String, default: null, trim: true },
  country: { type: String, default: null, trim: true },
  state: { type: String, default: null, trim: true },
  city: { type: String, default: null, trim: true },
  zip_code: { type: String, default: null, trim: true },
  house_no: { type: String, default: null, trim: true },
}, { timestamps: true });

export const BillingModel = model<TBilling>("Billing", billingSchema);