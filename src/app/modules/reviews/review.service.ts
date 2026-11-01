import mongoose from "mongoose";
import { AppError } from "../../classes/appError";
import { ProductModel } from "../product/product.model";
import UserModel from "../user/user.model";
import { TReview } from "./review.interface";
import ReviewModel from "./review.model";
import { StoreModel } from "../store/store.model";

const createReview = async (payload: TReview) => {
  const user = await UserModel.findOne({ email: payload.user });
  if (!user) throw new AppError(404, "User not found");
  const product = await ProductModel.findOne({ _id: payload.product });
  const store = await StoreModel.findById(product?.store);

  payload.user = user?._id.toString();

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const result = await ReviewModel.create([payload], { session });
    const storeAvgRating = store?.ratings !== 0 ? (store!.ratings! + payload.stars) / 2 : payload.stars;
    const productAvgRating = product?.ratings !== 0 ? (product!.ratings + payload.stars) / 2 : payload.stars;

    await store?.updateOne({ $set: { ratings: storeAvgRating } }, { session });
    await product?.updateOne({ $set: { ratings: productAvgRating } }, { session });


    await session.commitTransaction();
    return result;
  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(400, error.message || "Error creating review!")
  } finally {
    session.endSession();
  }
};

const getReviewsByProductId = async (productId: string) => {
  const product = await ProductModel.findOne({ _id: productId });
  if (!product) throw new AppError(404, "Invalid product id");
  const result = await ReviewModel.find({ product: productId }).populate("user");
  return result;
};

const getReviewStat = async (productId: string) => {
  const result = await ReviewModel.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$stars" },
        totalRatings: { $sum: "$stars" },
        totalReviews: { $sum: 1 },
        fiveStars: { $sum: { $cond: [{ $eq: ["$stars", 5] }, 1, 0] } },
        fourStars: { $sum: { $cond: [{ $eq: ["$stars", 4] }, 1, 0] } },
        threeStars: { $sum: { $cond: [{ $eq: ["$stars", 3] }, 1, 0] } },
        twoStars: { $sum: { $cond: [{ $eq: ["$stars", 2] }, 1, 0] } },
        oneStars: { $sum: { $cond: [{ $eq: ["$stars", 1] }, 1, 0] } },
      }
    }
  ])
  return result;
}

export const reviewService = {
  createReview,
  getReviewsByProductId,
  getReviewStat,
}