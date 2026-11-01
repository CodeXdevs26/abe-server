import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import validate from "../../middlewares/validate";
import firstResponderDiscountController from "./first-responder-discount.controller";
import { updateFirstResponderDiscountSchema } from "./first-responder-discount.validation";

const firstResponderDiscountRouters = Router();

firstResponderDiscountRouters.get(
  "/",
  firstResponderDiscountController.getFirstResponderDiscountSettings,
);

firstResponderDiscountRouters.patch(
  "/",
  authVerify(["admin"]),
  validate(updateFirstResponderDiscountSchema),
  firstResponderDiscountController.updateFirstResponderDiscountSettings,
);

export default firstResponderDiscountRouters;
