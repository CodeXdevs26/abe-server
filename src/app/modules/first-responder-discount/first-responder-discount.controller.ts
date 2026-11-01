import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import firstResponderDiscountServices from "./first-responder-discount.service";

const getFirstResponderDiscountSettings = handleAsyncRequest(
  async (req, res) => {
    const result =
      await firstResponderDiscountServices.getFirstResponderDiscountSettings();

    successResponse(res, {
      message: "First responder discounts retrieved successfully!",
      data: result,
    });
  },
);

const updateFirstResponderDiscountSettings = handleAsyncRequest(
  async (req, res) => {
    const result =
      await firstResponderDiscountServices.updateFirstResponderDiscountSettings(
        req.body,
      );

    successResponse(res, {
      message: "First responder discounts updated successfully!",
      data: result,
    });
  },
);

const firstResponderDiscountController = {
  getFirstResponderDiscountSettings,
  updateFirstResponderDiscountSettings,
};

export default firstResponderDiscountController;
