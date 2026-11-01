import { AppError } from "../../classes/appError";
import UserModel from "../user/user.model";
import { BillingModel } from "./billing.model";

const getMyBillingAddress = async (currentUserEmail: string) => {
  const user = await UserModel.findOne({ email: currentUserEmail });
  if (!user) throw new AppError(404, "User not found");
  const billingAddress = await BillingModel.findOne({ user: user._id });
  return billingAddress;
}

const updateMyBillingAddress = async (currentUserEmail: string, payload: any) => {
  const user = await UserModel.findOne({ email: currentUserEmail });
  if (!user) throw new AppError(404, "User not found");
  const billingAddress = await BillingModel.findOne({ user: user._id });
  if (!billingAddress) throw new AppError(404, "Billing address not found");
  const result = await BillingModel.findByIdAndUpdate(billingAddress._id, payload, { upsert: true, new: true });
  return result
}

export const billingServices = { getMyBillingAddress, updateMyBillingAddress }