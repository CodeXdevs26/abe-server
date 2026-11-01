import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import stripeConnectController from "./stripe-connect.controller";

const stripeConnectRouters = Router();

stripeConnectRouters.get("/return", stripeConnectController.handleReturnUrl);

stripeConnectRouters.get("/refresh", stripeConnectController.handleRefreshUrl);

stripeConnectRouters.post(
  "/account",
  authVerify(["vendor", "rider", "broker"]),
  stripeConnectController.createOrReuseConnectedAccount,
);

stripeConnectRouters.post(
  "/onboarding-link",
  authVerify(["vendor", "rider", "broker"]),
  stripeConnectController.createOnboardingLink,
);

stripeConnectRouters.get(
  "/status",
  authVerify(["vendor", "rider", "broker"]),
  stripeConnectController.getConnectedAccountStatus,
);

export default stripeConnectRouters;
