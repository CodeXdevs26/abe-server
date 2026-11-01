import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import subscriptionController from "./subscription.controller";

const subscriptionRouters = Router();

subscriptionRouters.post(
  "/create-checkout-session",
  authVerify(["broker", "rider", "vendor"]),
  subscriptionController.createCheckoutSession,
);

subscriptionRouters.get(
  "/my-subscription",
  authVerify(["broker", "rider", "vendor"]),
  subscriptionController.getMySubscription,
);

subscriptionRouters.get(
  "/handle-subscription-success",
  subscriptionController.handleSubscriptionSuccess,
);

export default subscriptionRouters;
