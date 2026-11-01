import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import { billingServices } from "./billing.service";

const getMyBillingAddress = handleAsyncRequest(async (req: any, res) => {
  const email = req?.user?.email;
  const result = await billingServices.getMyBillingAddress(email);
  successResponse(res, {
    message: "Billing address retrieved successfully!",
    data: result,
  })
})

const updateMyBillingAddress = handleAsyncRequest(async (req: any, res) => {
  const email = req?.user?.email;
  const bodyData = req.body;
  const result = await billingServices.updateMyBillingAddress(email, bodyData);
  successResponse(res, {
    message: "Billing address updated successfully!",
    data: result,
  })
})

export const billingController = {
  getMyBillingAddress,
  updateMyBillingAddress
}
