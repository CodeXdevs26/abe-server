import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import { reviewService } from "./review.service";

const createReview = handleAsyncRequest(async (req: any, res) => {
  const payload = req.body;
  const email = req.user.email;
  payload.user = email;
  const result = await reviewService.createReview(payload);
  successResponse(res, {
    message: "Review created successfully!",
    data: result,
    status: 201
  });
});

const getReviewsByProductId = handleAsyncRequest(async (req: any, res) => {
  const productId = req.params.productId;
  const result = await reviewService.getReviewsByProductId(productId);
  successResponse(res, {
    message: "Reviews retrieved successfully!",
    data: result,
  });
});

const getReviewStat = handleAsyncRequest(async (req: any, res) => {
  const productId = req.params.productId;
  const result = await reviewService.getReviewStat(productId);
  successResponse(res, {
    message: "Review stats retrieved successfully!",
    data: result,
  });
});

export const reviewController = {
  createReview,
  getReviewsByProductId,
  getReviewStat
}