import mongoose from "mongoose";
import { AppError } from "../../classes/appError";
import UserModel from "../user/user.model";
import { TOrder, TOrderItem } from "./order.interface";
import { BillingModel } from "../billing/billing.model";
import { ShippingModel } from "../shipping/shipping.model";
import OrderModel from "./order.model";
import { generateOrderId } from "../../utils/orderIdGenerator";
import { CartModel } from "../cart/cart.model";
import QueryBuilder from "../../classes/queryBuilder";
import VendorModel from "../vendor/vendor.model";
import voucherServices from "../voucher/voucher.service";
import PickupRequestModel from "../pickup-request/pickup-request.model";
import { buildDeliveryLocation } from "../../utils/buildDeliveryLocation";
import { chatServices } from "../chat/chat.service";
import firstResponderDiscountServices from "../first-responder-discount/first-responder-discount.service";

// const createOrder = async (currentUserEmail: string, payload: TOrder) => {
//   const user = await UserModel.findOne({ email: currentUserEmail, is_deleted: false });
//   if (!user) throw new AppError(404, "No current user found!");

//   const billingData = { ...payload.billing_address, user: user._id }
//   let shippingData = {};
//   if (payload.shipping_address) {
//     shippingData = { ...payload.shipping_address, user: user._id }
//   } else {
//     shippingData = { ...billingData }
//   }

//   const session = await mongoose.startSession();
//   try {
//     session.startTransaction();

//     const billingAddress = await BillingModel.findOne({ user: user._id });

//     if (billingAddress) {
//       const newBillingAddress = await BillingModel.findOneAndUpdate({ user: user._id }, billingData, { session, new: true });

//       payload.billing_address = newBillingAddress?._id as any
//     } else {
//       const newBillingAddress = await BillingModel.create([billingData], { session });
//       payload.billing_address = newBillingAddress[0]._id
//     }

//     const shippingAddress = await ShippingModel.findOne({ user: user._id });

//     if (shippingAddress) {
//       const newShippingAddress = await ShippingModel.findOneAndUpdate({ user: user._id }, shippingData, { session, new: true });
//       payload.shipping_address = newShippingAddress?._id as any
//     } else {
//       const newShippingAddress = await ShippingModel.create([shippingData], { session });
//       payload.shipping_address = newShippingAddress[0]?._id
//     }

//     payload.customer = user._id;

//     // group the products based on store id
//     const groupedItems = payload.items.reduce((acc, item: any) => {
//       const storeId = item.store.toString();

//       if (!acc[storeId]) {
//         acc[storeId] = [];
//       }
//       acc[storeId].push(item);

//       return acc;
//     }, {} as Record<string, TOrderItem[]>);
//     const allStoreItems = Object.values(groupedItems);

//     for (const distinctStoreItems of allStoreItems) {
//       const items = distinctStoreItems?.map((item) => (
//         {
//           product: item.product,
//           quantity: item.quantity,
//         }
//       )) as any;
//       payload.items = items;
//       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//       // @ts-ignore
//       payload.store = distinctStoreItems[0].store;
//       const orderId = generateOrderId();
//       payload.order_id = orderId;
//       await OrderModel.create([payload], { session });

//       for (const item of distinctStoreItems) {
//         await CartModel.findOneAndDelete({ user: user._id, product: item.product }, { session });
//       }
//     };

//     await session.commitTransaction();
//   } catch (error: any) {
//     await session.abortTransaction();
//     throw new AppError(500, error.message || "Something went wrong")
//   } finally {
//     session.endSession();
//   }
// }

const createCustomerVendorChatsForStores = async (
  customerEmail: string,
  storeIds: any[],
) => {
  try {
    const uniqueStoreIds = [
      ...new Set(storeIds.map((storeId) => storeId.toString())),
    ];
    if (!uniqueStoreIds.length) return;

    const vendors = await VendorModel.find({
      store: { $in: uniqueStoreIds },
      is_deleted: false,
      is_blocked: false,
    }).select("email");

    await Promise.allSettled(
      vendors.map((vendor) =>
        chatServices.createOrReuseConversationBetweenAccounts(
          { email: customerEmail, role: "user" },
          { email: vendor.email, role: "vendor" },
        ),
      ),
    );
  } catch {
    return;
  }
};

const createOrder = async (email: string, payload: TOrder) => {
  const user = await UserModel.findOne({ email, is_deleted: false });
  if (!user) throw new AppError(404, "No current user found!");

  const isPickupOrDineIn =
    payload.fulfillment_type === "pickup" ||
    payload.fulfillment_type === "dine_in";
  const isDelivery = !isPickupOrDineIn;

  const shippingAddressPayload: any = payload.shipping_address;

  if (isDelivery && !shippingAddressPayload?.address) {
    const hasStructuredShippingAddress = !!(
      shippingAddressPayload?.country ||
      shippingAddressPayload?.state ||
      shippingAddressPayload?.city ||
      shippingAddressPayload?.zip_code ||
      shippingAddressPayload?.street_address ||
      shippingAddressPayload?.house_no
    );

    if (!hasStructuredShippingAddress) {
      throw new AppError(
        400,
        "Shipping address is required for delivery orders",
      );
    }
  }
  if (
    isDelivery &&
    (typeof shippingAddressPayload?.location_coordinates?.latitude !==
      "number" ||
      typeof shippingAddressPayload?.location_coordinates?.longitude !==
        "number")
  ) {
    throw new AppError(
      400,
      "Shipping address coordinates are required for delivery orders",
    );
  }

  // group the products based on store id
  const groupedItems = payload.items.reduce(
    (acc, item: any) => {
      const storeId = item.store.toString();

      if (!acc[storeId]) {
        acc[storeId] = [];
      }
      acc[storeId].push(item);

      return acc;
    },
    {} as Record<string, TOrderItem[]>,
  );

  const allStoreItems = Object.values(groupedItems);

  const billingData = payload.billing_address
    ? { ...payload.billing_address, user: user._id }
    : undefined;
  let shippingData: any = {};
  if (payload.shipping_address) {
    shippingData = { ...payload.shipping_address, user: user._id };
  } else if (!isPickupOrDineIn && billingData) {
    shippingData = { ...billingData };
  }

  const session = await mongoose.startSession();
  const orderIds: any[] = [];
  const chatStoreIds: any[] = [];
  let orderCommitted = false;

  try {
    session.startTransaction();

    // update billing address or create (only for delivery)
    if (billingData) {
      const billingAddress = await BillingModel.findOne({ user: user._id });
      if (billingAddress) {
        const newBillingAddress = await BillingModel.findOneAndUpdate(
          { user: user._id },
          billingData,
          { session, new: true },
        );
        payload.billing_address = newBillingAddress?._id as any;
      } else {
        const newBillingAddress = await BillingModel.create([billingData], {
          session,
        });
        payload.billing_address = newBillingAddress[0]._id;
      }
    }

    // update shipping address or create (only for delivery)
    if (!isPickupOrDineIn) {
      const shippingAddress = await ShippingModel.findOne({ user: user._id });

      if (shippingAddress) {
        const newShippingAddress = await ShippingModel.findOneAndUpdate(
          { user: user._id },
          shippingData,
          { session, new: true },
        );
        payload.shipping_address = newShippingAddress?._id as any;
      } else {
        const newShippingAddress = await ShippingModel.create([shippingData], {
          session,
        });
        payload.shipping_address = newShippingAddress[0]?._id;
      }
    }

    payload.customer = user._id;

    const firstResponderDiscountPercentage =
      await firstResponderDiscountServices.getFirstResponderDiscountPercentage(
        user,
      );
    let rewardPointsDiscountPercentage = 0;
    const pointsToRedeem = payload.pointsToRedeem || 0;

    if (pointsToRedeem > 0) {
      if (pointsToRedeem >= 2000) rewardPointsDiscountPercentage = 0.2;
      else if (pointsToRedeem >= 1000) rewardPointsDiscountPercentage = 0.1;
      else if (pointsToRedeem >= 500) rewardPointsDiscountPercentage = 0.05;
      else if (pointsToRedeem >= 100) rewardPointsDiscountPercentage = 0.01;

      if (rewardPointsDiscountPercentage > 0) {
        const now = new Date();
        const validPoints =
          user.rewardPoints?.filter(
            (p) => p.expiresAt > now && p.remainingPoints > 0,
          ) || [];
        const totalValidPoints = validPoints.reduce(
          (sum, p) => sum + p.remainingPoints,
          0,
        );

        const pointsNeeded =
          pointsToRedeem >= 2000
            ? 2000
            : pointsToRedeem >= 1000
              ? 1000
              : pointsToRedeem >= 500
                ? 500
                : 100;

        if (totalValidPoints < pointsNeeded) {
          throw new AppError(
            400,
            "Not enough valid reward points to redeem this tier.",
          );
        }

        let pointsToDeduct = pointsNeeded;
        validPoints.sort(
          (a, b) =>
            new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
        );
        for (const p of validPoints) {
          if (pointsToDeduct <= 0) break;
          if (p.remainingPoints >= pointsToDeduct) {
            p.remainingPoints -= pointsToDeduct;
            pointsToDeduct = 0;
          } else {
            pointsToDeduct -= p.remainingPoints;
            p.remainingPoints = 0;
          }
        }
        await user.save({ session });
      }
    }

    const appliedDiscountPercentage = Math.max(
      firstResponderDiscountPercentage,
      rewardPointsDiscountPercentage,
    );

    for (const distinctStoreItems of allStoreItems) {
      const items = distinctStoreItems?.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        discount: item.discount,
      }));
      payload.items = items;

      payload.store = (distinctStoreItems[0] as any).store;
      chatStoreIds.push(payload.store);
      const orderId = generateOrderId();
      payload.order_id = orderId;
      const shipping_fee = isPickupOrDineIn
        ? 0
        : (distinctStoreItems[0] as any).shipping_fee;

      let subtotal = distinctStoreItems.reduce(
        (sum: any, item: any) => sum + item.amount * item.quantity,
        0,
      );
      if (appliedDiscountPercentage > 0) {
        subtotal = subtotal * (1 - appliedDiscountPercentage);
      }
      payload.total = subtotal + shipping_fee;
      payload.subtotal = subtotal;
      payload.shipping_fee = shipping_fee;
      payload.fulfillment_type = payload.fulfillment_type || "delivery";
      payload.first_responder_type = user.first_responder_type || null;
      payload.first_responder_discount_percentage =
        firstResponderDiscountPercentage;
      payload.reward_points_discount_percentage =
        rewardPointsDiscountPercentage;
      payload.applied_discount_percentage = appliedDiscountPercentage;
      const order = await OrderModel.create([payload], { session });
      const id = order[0]._id;
      orderIds.push(id);

      // Create voucher for dine_in orders
      if (payload.fulfillment_type === "dine_in") {
        const voucher = await voucherServices.createVoucherForOrder(order[0]);
        await OrderModel.findByIdAndUpdate(
          id,
          { voucher: voucher._id },
          { session },
        );
      }

      // Create pickup request for delivery orders
      if (payload.fulfillment_type === "delivery") {
        const orderWithAddress = await OrderModel.findById(id)
          .populate(
            "shipping_address",
            "country state city zip_code street_address house_no address location_coordinates",
          )
          .populate(
            "billing_address",
            "country state city zip_code street_address house_no address",
          );
        const shippingAddr: any =
          orderWithAddress?.shipping_address ||
          orderWithAddress?.billing_address ||
          {};
        const delivery_location = buildDeliveryLocation(shippingAddr);
        if (!delivery_location) {
          throw new AppError(
            400,
            "A valid shipping address is required for delivery orders",
          );
        }
        const delivery_coordinates =
          typeof shippingAddr?.location_coordinates?.latitude === "number" &&
          typeof shippingAddr?.location_coordinates?.longitude === "number"
            ? {
                latitude: shippingAddr.location_coordinates.latitude,
                longitude: shippingAddr.location_coordinates.longitude,
              }
            : null;
        if (!delivery_coordinates) {
          throw new AppError(
            400,
            "Shipping address coordinates are required for delivery orders",
          );
        }

        const pickupRequest = await PickupRequestModel.create(
          [
            {
              order: id,
              status: "requesting",
              rejections: [],
              delivery_location,
              delivery_coordinates,
            },
          ],
          { session },
        );
        await OrderModel.findByIdAndUpdate(
          id,
          { pickupRequest: pickupRequest[0]._id },
          { session },
        );
      }

      for (const item of distinctStoreItems) {
        await CartModel.findOneAndDelete(
          { user: user._id, product: item.product },
          { session },
        );
      }
    }

    await session.commitTransaction();
    orderCommitted = true;
  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(500, error.message || "Something went wrong");
  } finally {
    session.endSession();
  }

  if (orderCommitted) {
    await createCustomerVendorChatsForStores(email, chatStoreIds);
  }
};

const getUsersOrders = async (
  currentUserEmail: string,
  query: Record<string, any>,
) => {
  const user = await UserModel.findOne({
    email: currentUserEmail,
    is_deleted: false,
  });
  if (!user) throw new AppError(404, "No current user found!");
  const searchableFields = ["name", "description"];
  query.payment_status = "paid";
  const findQuery = new QueryBuilder(
    OrderModel.find({ customer: user?._id }),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .selectFields();

  const meta = await findQuery.countTotal();
  const result = await findQuery.queryModel;
  return { data: result, meta };
};

const getVendorsOrders = async (
  currentUserEmail: string,
  query: Record<string, any>,
) => {
  const vendor = await VendorModel.findOne({
    email: currentUserEmail,
    is_deleted: false,
    is_blocked: false,
  });
  if (!vendor) throw new AppError(404, "No current vendor found!");

  const searchableFields = ["order_id"];
  const findQuery = new QueryBuilder(
    OrderModel.find({ store: vendor.store })
      .populate("customer", "name email")
      .populate("pickupRequest", "status"),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .selectFields();

  const meta = await findQuery.countTotal();
  const result = await findQuery.queryModel;
  return { data: result, meta };
};

const getSingleOrder = async (orderId: string) => {
  const order = await OrderModel.findById(orderId)
    .select(
      "order_id createdAt total status payment_status payment_method items shipping_address billing_address fulfillment_type voucher",
    )
    .populate("shipping_address")
    .populate("billing_address")
    .populate("items.product")
    .populate({
      path: "voucher",
      model: "Voucher",
    });

  if (!order) return order;

  const pickupRequest = await PickupRequestModel.findOne({ order: orderId })
    .select("delivery_proof_image")
    .lean();

  return {
    ...order.toObject(),
    delivery_proof_image: pickupRequest?.delivery_proof_image || null,
  };
};

const updateOrderStatus = async (
  orderId: string,
  status: "processing" | "ongoing" | "delivered" | "canceled",
  payment_status: "paid" | "unpaid",
) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new AppError(404, "Invalid order id!");

  const wasUnpaid = order.payment_status !== "paid";

  order.status = status || order.status;
  order.payment_status = payment_status || order.payment_status;
  await order.save();

  if (wasUnpaid && order.payment_status === "paid") {
    const user = await UserModel.findById(order.customer);
    if (user) {
      const pointsEarned = Math.floor(order.total);
      if (pointsEarned > 0) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        user.rewardPoints = user.rewardPoints || [];
        user.rewardPoints.push({
          points: pointsEarned,
          remainingPoints: pointsEarned,
          earnedAt: new Date(),
          expiresAt,
        });
        await user.save();
      }
    }
  }

  return order;
};

export const orderService = {
  createOrder,
  getUsersOrders,
  getVendorsOrders,
  getSingleOrder,
  updateOrderStatus,
};
