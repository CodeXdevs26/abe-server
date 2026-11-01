import { ObjectId } from "mongoose";

export type TProduct = {
  name: string;
  images: string[];
  category: ObjectId;
  store: ObjectId;
  price: number;
  description?: string;
  quantity: number;
  discount?: number;
  ratings: number;
  is_deleted: boolean;
};