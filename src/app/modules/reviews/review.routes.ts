import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import { reviewController } from "./review.controller";

const reviewRouters = Router();

reviewRouters.post('/', authVerify(["user"]), reviewController.createReview);
reviewRouters.get('/:productId', reviewController.getReviewsByProductId);
reviewRouters.get('/stats/:productId', reviewController.getReviewStat);
export default reviewRouters;