import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import paymentController from "./payment.controller";
import { orderDataSchema } from "./payment.validation";
import validate from "../../middlewares/validate";

const paymentRouters = Router();
paymentRouters.post(
  "/create-payment-session",
  authVerify(["user"]),
  validate(orderDataSchema),
  paymentController.createPaymentSession,
);
paymentRouters.get(
  "/handle-payment-success",
  paymentController.handlePaymentSuccess,
);
paymentRouters.get(
  "/earning-stats",
  authVerify(["admin"]),
  paymentController.getEarningStatsController,
);

export default paymentRouters;
