import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import stripeConnectServices from "./stripe-connect.service";

const getCurrentRole = (req: any) =>
  req.user.role as "vendor" | "rider" | "broker";
const getCurrentEmail = (req: any) => req.user.email as string;

const createOrReuseConnectedAccount = handleAsyncRequest(async (req: any, res) => {
  const result = await stripeConnectServices.createOrReuseConnectedAccount(
    getCurrentRole(req),
    getCurrentEmail(req),
  );

  successResponse(res, {
    message: "Stripe Connect account retrieved successfully!",
    data: result,
  });
});

const createOnboardingLink = handleAsyncRequest(async (req: any, res) => {
  const result = await stripeConnectServices.createOnboardingLink(
    getCurrentRole(req),
    getCurrentEmail(req),
    req.body,
  );

  successResponse(res, {
    message: "Stripe Connect onboarding link created successfully!",
    data: result,
  });
});

const getConnectedAccountStatus = handleAsyncRequest(async (req: any, res) => {
  const result = await stripeConnectServices.getConnectedAccountStatus(
    getCurrentRole(req),
    getCurrentEmail(req),
  );

  successResponse(res, {
    message: "Stripe Connect account status retrieved successfully!",
    data: result,
  });
});

const handleReturnUrl = handleAsyncRequest(async (req: any, res) => {
  successResponse(res, {
    message: "Stripe Connect onboarding completed successfully!",
    data: {
      success: true,
    },
  });
});

const handleRefreshUrl = handleAsyncRequest(async (req: any, res) => {
  successResponse(res, {
    message: "Stripe Connect onboarding link needs to be refreshed.",
    data: {
      success: true,
    },
  });
});

const stripeConnectController = {
  createOrReuseConnectedAccount,
  createOnboardingLink,
  getConnectedAccountStatus,
  handleReturnUrl,
  handleRefreshUrl,
};

export default stripeConnectController;
