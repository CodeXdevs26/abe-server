import { TFile } from "../../interface/file.interface";

export type TRiderLocation = {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
};

export type TRider = {
  name: string;
  image: string;
  email: string;
  balance: number;
  location?: string | null;
  location_coordinates?: TRiderLocation;
  contact?: string | null;
  driving_license: string;
  stripe_connect_account_id?: string | null;
  stripe_connect_onboarding_completed?: boolean;
  stripe_connect_charges_enabled?: boolean;
  stripe_connect_payouts_enabled?: boolean;
  is_approved: boolean;
  is_blocked: boolean;
  is_deleted: boolean;
};

export type TRiderFiles = {
  image: TFile[];
  document: TFile[];
};
