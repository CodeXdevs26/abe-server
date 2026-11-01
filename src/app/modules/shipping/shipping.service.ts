import { AppError } from "../../classes/appError";
import UserModel from "../user/user.model";
import { ShippingModel } from "./shipping.model";

const getMyShippingAddress = async (currentUserEmail: string) => {
  const user = await UserModel.findOne({ email: currentUserEmail });
  if (!user) throw new AppError(404, "User not found");
  const shippingAddress = await ShippingModel.findOne({ user: user._id });
  return shippingAddress;
};

export const shippingServices = { getMyShippingAddress };
