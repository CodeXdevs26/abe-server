import { model, Schema } from "mongoose";
import {
  defaultProfileImg,
} from "../../constants/global.constant";
import { TBroker } from "./broker.interface";

const brokerSchema = new Schema<TBroker>(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, required: false, default: defaultProfileImg },
    referral_code: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true },
    referral_users: { type: Number, default: 0 },
    location: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true },
    balance: { type: Number, default: 0 },
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
    is_approved: { type: Boolean, default: false },
    is_blocked: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const BrokerModel = model<TBroker>("Broker", brokerSchema);
export default BrokerModel;
