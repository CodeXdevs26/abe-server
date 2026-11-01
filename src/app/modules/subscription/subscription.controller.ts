import { Request, Response } from "express";
import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import subscriptionServices from "./subscription.service";

const createCheckoutSession = handleAsyncRequest(async (req: any, res) => {
  const result = await subscriptionServices.createCheckoutSession(
    req.user.email,
    req.user.role,
  );

  successResponse(res, {
    message: "Subscription session created successfully!",
    data: result,
    status: 201,
  });
});

const getMySubscription = handleAsyncRequest(async (req: any, res) => {
  const result = await subscriptionServices.getRoleSubscriptionSummary(
    req.user.email,
    req.user.role,
  );

  successResponse(res, {
    message: "Subscription retrieved successfully!",
    data: result,
  });
});

const handleWebhook = async (req: Request, res: Response) => {
  const result = await subscriptionServices.handleWebhook(
    req.body as Buffer,
    req.headers["stripe-signature"],
  );

  res.status(200).json(result);
};

const handleSubscriptionSuccess = handleAsyncRequest(async (req: any, res) => {
  const query = req.query;
  const result = await subscriptionServices.handleSubscriptionSuccess(query);
  successResponse(res, {
    message: "Subscription status retrieved!",
    data: result,
  });
});

const subscriptionController = {
  createCheckoutSession,
  getMySubscription,
  handleWebhook,
  handleSubscriptionSuccess,
};

export default subscriptionController;
