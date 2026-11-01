import { model, Schema } from "mongoose";
import { TPayment } from "./payment.interface";

const PaymentSchema = new Schema<TPayment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    transaction_id: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    payment_status: {
      type: String,
      enum: ["paid", "failed", "pending"],
      required: true,
    },
    currency: { type: String, required: true, uppercase: true },
  },
  { timestamps: true },
);

export const PaymentModel = model<TPayment>("Payment", PaymentSchema);
