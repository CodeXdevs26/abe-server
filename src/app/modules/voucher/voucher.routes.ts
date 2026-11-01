import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import voucherController from "./voucher.controller";

const voucherRouters = Router();

voucherRouters.get(
  "/my-vouchers",
  authVerify(["user"]),
  voucherController.getUserVouchers,
);

voucherRouters.post(
  "/validate/:code",
  authVerify(["vendor"]),
  voucherController.validateVoucher,
);

export default voucherRouters;