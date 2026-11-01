import { model, Schema, Types } from "mongoose"; import { TShipping } from "./shipping.interface";
;

const shippingSchema = new Schema<TShipping>({
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
  address: { type: String, default: null, trim: true }, // legacy field
  location_coordinates: {
    latitude: { type: Number, required: false, default: null },
    longitude: { type: Number, required: false, default: null },
  },
}, { timestamps: true });

export const ShippingModel = model<TShipping>("Shipping", shippingSchema);
