import mongoose, { model, Schema } from "mongoose";
import { defaultCoverImg } from "../../constants/global.constant";
import { TStore } from "./store.interface";

const StoreSchema = new Schema<TStore>(
  {
    name: { type: String, required: true, trim: true },
    cover_images: {
      type: [String],
      required: false,
      default: [defaultCoverImg],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        index: "2dsphere",
      },
    },
    ratings: { type: Number, default: 0 },
    description: { type: String, required: false, trim: true, default: null },
    categories: {
      type: [mongoose.Types.ObjectId],
      ref: "Category",
      required: false,
      default: [],
    },
    is_blocked: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

StoreSchema.index({ location: "2dsphere" });

export const StoreModel = model<TStore>("Store", StoreSchema);
