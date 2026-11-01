import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import { shippingServices } from "./shipping.service";

const getMyShippingAddress = handleAsyncRequest(async (req: any, res) => {
  const email = req?.user?.email;
  const result = await shippingServices.getMyShippingAddress(email);
  successResponse(res, {
    message: "Shipping address retrieved successfully!",
    data: result,
  });
});

export const shippingController = { getMyShippingAddress };
