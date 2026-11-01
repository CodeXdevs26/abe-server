import { ObjectId } from "mongoose";

export type TPickupRequest = {
  order: ObjectId;
  rider?: ObjectId;
  delivery_location?: string;
  delivery_coordinates?: {
    latitude: number;
    longitude: number;
  };
  delivery_proof_image?: string | null;
  status: 'requesting' | 'ongoing' | 'delivered' | 'canceled';
  rejections: ObjectId[];
}
