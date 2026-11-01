import { ObjectId } from "mongoose";
import { TFile } from "../../interface/file.interface";

export type TVendor = {
  email: string;
  store?: ObjectId;
  tax_document: string;
  balance: number;
  contact: string;
  broker_referral?: string | null;
  stripe_connect_account_id?: string | null;
  stripe_connect_onboarding_completed?: boolean;
  stripe_connect_charges_enabled?: boolean;
  stripe_connect_payouts_enabled?: boolean;
  is_approved: boolean;
  is_blocked: boolean;
  is_deleted: boolean;
};

export type TVendorFiles = {
  images: TFile[];
  document: TFile[];
};
