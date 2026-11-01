import config from "../../config";
import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import paymentServices, { getEarningStats } from "./payment.service";
import { Request, Response } from "express";

const createPaymentSession = handleAsyncRequest(async (req: any, res) => {
  const body = req.body;
  const email = req.user.email;
  const result = await paymentServices.createPaymentSession(body, email);
  successResponse(res, {
    message: "Payment session created successfully!",
    data: result,
    status: 201,
  });
});

const handlePaymentSuccess = handleAsyncRequest(async (req: any, res) => {
  const query = req.query;
  const result = await paymentServices.handlePaymentSuccess(query);
  if (query.isWeb === "true") {
    res.redirect(`${config.payment_success_url_web}`);
  }
  successResponse(res, {
    message: "Payment success handled!",
    data: result,
  });
});

const getEarningStatsController = handleAsyncRequest(async (req, res) => {
  const query = req.query;
  const result = await getEarningStats(query);
  successResponse(res, {
    message: "Earning stats retrieved successfully!",
    data: result,
  });
});

const handleWebhook = async (req: Request, res: Response) => {
  const result = await paymentServices.handleWebhook(
    req.body as Buffer,
    req.headers["stripe-signature"],
  );

  res.status(200).json(result);
};

const paymentController = {
  createPaymentSession,
  handlePaymentSuccess,
  handleWebhook,
  getEarningStatsController,
};

export default paymentController;
