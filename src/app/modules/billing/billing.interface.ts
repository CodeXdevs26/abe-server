import { ObjectId } from "mongoose";

export type TBilling = {
  user: ObjectId;
  name: string;
  company_name?: string;
  street_address: string;
  country: string;
  state: string;
  city: string;
  zip_code: string;
  house_no?: string;
  email: string;
  phone: string;
}