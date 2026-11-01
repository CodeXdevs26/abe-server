import { ObjectId } from "mongoose";

export type TCart = {
  user: ObjectId;
  product: ObjectId;
  quantity: number;
  subtotal: number;
}