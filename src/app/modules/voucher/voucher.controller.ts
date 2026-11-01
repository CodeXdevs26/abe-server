import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import voucherServices from "./voucher.service";

const getUserVouchers = handleAsyncRequest(async (req: any, res) => {
  const userEmail = req.user.email;
  const result = await voucherServices.getUserVouchers(userEmail);
  successResponse(res, {
    message: "Vouchers retrieved successfully!",
    data: result,
  });
});

const validateVoucher = handleAsyncRequest(async (req: any, res) => {
  const code = req.params.code;
  const vendorEmail = req.user?.email;
  const result = await voucherServices.validateVoucher(code, vendorEmail);
  successResponse(res, {
    message: "Voucher validated successfully!",
    data: result,
  });
});

const voucherController = {
  getUserVouchers,
  validateVoucher,
};

export default voucherController;