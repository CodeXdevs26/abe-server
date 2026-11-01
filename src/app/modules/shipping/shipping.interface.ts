import { ObjectId } from "mongoose";

export type TShipping = {
  user: ObjectId;
  name: string;
  email: string;
  phone: string;
  company_name?: string;
  street_address?: string;
  country?: string;
  state?: string;
  city?: string;
  zip_code?: string;
  house_no?: string;
  address?: string;
  location_coordinates?: {
    latitude: number;
    longitude: number;
  };
};
