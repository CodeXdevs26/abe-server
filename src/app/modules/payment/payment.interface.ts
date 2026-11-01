import { ObjectId } from "mongoose";

export interface TPayment {
  user: ObjectId;
  store: ObjectId;
  transaction_id: string;
  amount: number;
  payment_status: 'paid' | 'failed' | 'pending';
  currency: string;
}
