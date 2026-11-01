import {
  DEFAULT_FIRST_RESPONDER_DISCOUNTS,
  TFirstResponderStatus,
  TFirstResponderType,
} from "../../constants/firstResponder.constant";
import { TFirstResponderDiscounts } from "./first-responder-discount.interface";
import FirstResponderDiscountModel from "./first-responder-discount.model";

const SETTINGS_KEY = "first_responder_discounts";

const getFirstResponderDiscountSettings = async () => {
  const settings = await FirstResponderDiscountModel.findOneAndUpdate(
    { key: SETTINGS_KEY },
    {
      $setOnInsert: {
        key: SETTINGS_KEY,
        ...DEFAULT_FIRST_RESPONDER_DISCOUNTS,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return settings;
};

const updateFirstResponderDiscountSettings = async (
  payload: Partial<TFirstResponderDiscounts>,
) => {
  const settings = await FirstResponderDiscountModel.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: payload, $setOnInsert: { key: SETTINGS_KEY } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return settings;
};

const getFirstResponderDiscountPercentage = async ({
  first_responder_type,
  first_responder_status,
}: {
  first_responder_type?: TFirstResponderType | null;
  first_responder_status?: TFirstResponderStatus | null;
}) => {
  if (!first_responder_type || first_responder_status !== "approved") {
    return 0;
  }

  const settings = await getFirstResponderDiscountSettings();
  const discount = Number(settings?.[first_responder_type]) || 0;

  return discount / 100;
};

const firstResponderDiscountServices = {
  getFirstResponderDiscountSettings,
  updateFirstResponderDiscountSettings,
  getFirstResponderDiscountPercentage,
};

export default firstResponderDiscountServices;
