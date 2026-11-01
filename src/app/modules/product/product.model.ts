import mongoose, { Schema, model } from "mongoose";
import { TProduct } from "./product.interface";

const ProductSchema = new Schema<TProduct>(
  {
    name: { type: String, required: true, trim: true },
    images: { type: [String], required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: false, default: 0 },
    is_deleted: { type: Boolean, default: false },
    ratings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ProductModel = model<TProduct>("Product", ProductSchema);
