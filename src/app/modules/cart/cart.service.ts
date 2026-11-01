import mongoose, { ObjectId } from "mongoose";
import { AppError } from "../../classes/appError";
import { ProductModel } from "../product/product.model";
import UserModel from "../user/user.model"
import { TCart } from "./cart.interface";
import { CartModel } from "./cart.model";
import { StoreModel } from "../store/store.model";

const getDiscountedPrice = (price: number, discount?: number) => {
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), 100);
  const discountedPrice = price * (1 - safeDiscount / 100);
  return Number(discountedPrice.toFixed(2));
};

const addToCart = async (payload: TCart, currentUserEmail: string) => {
  const user = await UserModel.findOne({ email: currentUserEmail, is_deleted: false });
  if (!user) throw new AppError(404, "Invalid user id");

  const product = await ProductModel.findOne({ _id: payload.product, is_deleted: false });
  if (!product) throw new AppError(404, "Invalid product id");
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const cart = await CartModel.findOne({ user: user._id, product: payload.product });
    if (cart) {
      const quantity = cart.quantity + payload.quantity;
      const subtotal = product.price * quantity;
      cart.quantity = quantity;
      cart.subtotal = Number(subtotal.toFixed(2));
      const result = await cart.save({ session });
      await product.updateOne({ $inc: { quantity: -payload.quantity } }, { session });
      await session.commitTransaction();
      return result;
    }

    payload.subtotal = product.price * payload.quantity;
    payload.user = user._id as unknown as ObjectId;
    const result = await CartModel.create([payload], { session });
    await product.updateOne({ $inc: { quantity: -payload.quantity } }, { session });
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(500, error.message || "Error creating cart!");
  } finally {
    session.endSession();
  }
}

const getCartByUser = async (currentUserEmail: string, query: Record<string, any>) => {
  let userCoords = query?.userCoords;

  const user = await UserModel.findOne({ email: currentUserEmail, is_deleted: false });
  if (!user) throw new AppError(404, "Invalid user id");

  const result = await CartModel.find({ user: user._id })
    .populate({
      path: "product",
      select: "name images price discount store",
      populate: {
        path: "store",
        select: "location",
      },
    });

  const uniqueStoreIds = Array.from(
    new Map(
      result?.map((cart: any) => [
        cart.product.store._id.toString(),
        cart.product.store._id.toString(),
      ])
    ).values()
  );

  if (typeof userCoords === 'string') {
    userCoords = userCoords?.split(',')?.map(item => Number(item));
  }

  let totalShippingFee = 0;
  const storeShippingFees: Record<string, number> = {}; // Store ID to shipping fee map

  if (userCoords !== undefined && userCoords?.length === 2) {
    try {
      const storeDistances = await StoreModel.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: userCoords
            },
            distanceField: "distance",
            spherical: true,
            key: "location"
          }
        },
        {
          $match: { _id: { $in: uniqueStoreIds.map(id => new mongoose.Types.ObjectId(id)) } }
        },
        {
          $project: {
            _id: 1,
            distance: 1
          }
        }
      ]);

      // Map store distances to shipping fees
      storeDistances.forEach(store => {
        storeShippingFees[store._id.toString()] = Number((store.distance / 1609.34 * 2).toFixed(2));
      });

      // Calculate total shipping fee
      totalShippingFee = Object.values(storeShippingFees).reduce((acc, fee) => acc + fee, 0);
    } catch (error: any) {
      throw new AppError(500, error.message || "Error retrieving cart!");
    }
  }

  // Assign shipping fee to each cart item
  const cartWithShippingFee = result?.map((cart: any) => {
    const storeId = cart.product.store._id.toString();
    const cartObject = cart.toObject();
    const discountedPrice = getDiscountedPrice(
      cartObject.product.price,
      cartObject.product.discount,
    );

    return {
      ...cartObject,
      product: {
        ...cartObject.product,
        price: discountedPrice,
      },
      subtotal: Number((discountedPrice * cartObject.quantity).toFixed(2)),
      shippingFee: storeShippingFees[storeId] || 0
    };
  });

  return { result: cartWithShippingFee, totalShippingFee };
};

const increaseQuantity = async (cartId: string) => {
  const cart: any = await CartModel.findById(cartId).populate("product", "price");
  if (!cart) throw new AppError(404, "Invalid cart id");
  const product = await ProductModel.findById(cart.product);
  if (!product) throw new AppError(404, "Invalid product id");
  if (product.quantity === 0) throw new AppError(400, "Product is out of stock");
  cart.quantity += 1;
  cart.subtotal += cart.product.price;
  const session = await mongoose.startSession();

  try {
    session.startTransaction()
    const result = await cart.save({ session });
    await product.updateOne({ $inc: { quantity: -1 } }, { session });
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(500, error.message || "Error creating cart!");
  } finally {
    session.endSession();
  }
}

const decreaseQuantity = async (cartId: string) => {
  const cart: any = await CartModel.findById(cartId).populate("product", "price");
  if (!cart) throw new AppError(404, "Invalid cart id");
  const product = await ProductModel.findById(cart.product);
  if (!product) throw new AppError(404, "Invalid product id");
  cart.quantity -= 1;
  cart.subtotal -= cart.product.price;
  const session = await mongoose.startSession();

  try {
    session.startTransaction()
    let result
    if (cart.quantity === 0) {
      result = await cart.deleteOne({ session });
    } else {
      result = await cart.save({ session });
    }
    await product.updateOne({ $inc: { quantity: 1 } }, { session });
    await session.commitTransaction();
    return result
  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(500, error.message || "Error creating cart!");
  } finally {
    session.endSession();
  }
}

const deleteCart = async (cartId: string) => {
  const cart = await CartModel.findById(cartId);
  if (!cart) throw new AppError(404, "Invalid cart id");
  const product = await ProductModel.findById(cart.product);
  if (!product) throw new AppError(404, "Invalid product id");
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    await cart.deleteOne({ session });
    await product.updateOne({ $inc: { quantity: cart.quantity } }, { session });
    await session.commitTransaction();
  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(500, error.message || "Error deleting cart!");
  } finally {
    session.endSession();
  }
}

export const cartService = {
  addToCart,
  getCartByUser,
  increaseQuantity,
  decreaseQuantity,
  deleteCart
}
