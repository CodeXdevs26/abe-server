import mongoose, { Schema } from "mongoose";
import { TBanner } from "./banner.interface";

const bannerSchema = new Schema<TBanner>(
  {
    image: { type: String, required: true },
    index: { type: Number, required: true, default: 0, unique: true },
  },
  {
    timestamps: true,
  },
);

const BannerModel = mongoose.model<TBanner>("Banner", bannerSchema);
export default BannerModel;