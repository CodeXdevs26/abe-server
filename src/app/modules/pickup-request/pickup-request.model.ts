import mongoose, { model, Schema } from "mongoose";
import { TPickupRequest } from "./pickup-request.interface";

const pickupRequestSchema = new Schema<TPickupRequest>({
  order: { type: mongoose.Types.ObjectId, required: true, ref: "Order" },
  rider: { type: mongoose.Types.ObjectId, ref: "Rider" },
  delivery_location: { type: String, required: false },
  delivery_coordinates: {
    latitude: { type: Number, required: false, default: null },
    longitude: { type: Number, required: false, default: null },
  },
  delivery_proof_image: { type: String, required: false, default: null },
  status: {
    type: String,
    enum: ["requesting", "ongoing", "delivered", "canceled"],
    default: "requesting",
  },
  rejections: { type: [mongoose.Types.ObjectId], default: [] },
});

const PickupRequestModel = model<TPickupRequest>(
  "PickupRequest",
  pickupRequestSchema,
);

export default PickupRequestModel;
