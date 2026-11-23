import crypto from "crypto";
import Stripe from "stripe";
import config from "../../config";
import UserModel from "../user/user.model";
import mongoose from "mongoose";
import { AppError } from "../../classes/appError";
import { generateOrderId } from "../../utils/orderIdGenerator";
import { TOrder, TOrderItem } from "../order/order.interface";
import { BillingModel } from "../billing/billing.model";
import { ShippingModel } from "../shipping/shipping.model";
import OrderModel from "../order/order.model";
import { CartModel } from "../cart/cart.model";
import { generateTransactionId } from "../../utils/transactionIdGenerator";
import { PaymentModel } from "./payment.model";
import VendorModel from "../vendor/vendor.model";
import voucherServices from "../voucher/voucher.service";
import settlementServices from "../settlement/settlement.service";
import RiderModel from "../rider/rider.model";
import { chatServices } from "../chat/chat.service";
import firstResponderDiscountServices from "../first-responder-discount/first-responder-discount.service";

// Initialize the Stripe client
const stripe = new Stripe(config.stripe_secret_key as string, {
  apiVersion: "2025-01-27.acacia",
});

const getPaymentIntentChargeId = async (
  paymentIntent: string | Stripe.PaymentIntent | null,
) => {
  if (!paymentIntent) return null;

  const paymentIntentId =
    typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const latestCharge = intent.latest_charge;

  if (!latestCharge) return null;
  return typeof latestCharge === "string" ? latestCharge : latestCharge.id;
};

const syncConnectedAccountStatus = async (account: Stripe.Account) => {
  const update = {
    stripe_connect_onboarding_completed: !!account.details_submitted,
    stripe_connect_charges_enabled: !!account.charges_enabled,
    stripe_connect_payouts_enabled: !!account.payouts_enabled,
  };
  const role = account.metadata?.role;
  const ownerId = account.metadata?.owner_id;

  if (role === "vendor" && ownerId) {
    await VendorModel.findByIdAndUpdate(ownerId, {
      ...update,
      stripe_connect_account_id: account.id,
    });
    return;
  }

  if (role === "rider" && ownerId) {
    await RiderModel.findByIdAndUpdate(ownerId, {
      ...update,
      stripe_connect_account_id: account.id,
    });
    return;
  }

  await VendorModel.findOneAndUpdate(
    { stripe_connect_account_id: account.id },
    update,
  );
  await RiderModel.findOneAndUpdate(
    { stripe_connect_account_id: account.id },
    update,
  );
};

const buildCheckoutIdempotencyKey = (
  email: string,
  payload: TOrder & { isWeb?: boolean },
) => {
  const bucket = Math.floor(Date.now() / 10000);
  const normalizedPayload = {
    fulfillment_type: payload.fulfillment_type || "delivery",
    payment_method: payload.payment_method,
    pointsToRedeem: payload.pointsToRedeem || 0,
    billing_address: payload.billing_address || null,
    shipping_address: payload.shipping_address || null,
    items: [...(payload.items || [])]
      .map((item: any) => ({
        product: item.product,
        store: item.store,
        quantity: item.quantity,
        amount: item.amount,
        shipping_fee: item.shipping_fee || 0,
        discount: item.discount || 0,
      }))
      .sort((a, b) =>
        `${a.store}-${a.product}`.localeCompare(`${b.store}-${b.product}`),
      ),
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ email, bucket, normalizedPayload }))
    .digest("hex");
};

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

const createPaymentSession = async (
  { isWeb, ...payload }: TOrder & { isWeb: boolean },
  email: string,
) => {
  const user = await UserModel.findOne({ email, is_deleted: false });
  if (!user) throw new AppError(404, "No current user found!");

  const fulfillment_type = payload.fulfillment_type || "delivery";
  const isPickupOrDineIn =
    fulfillment_type === "pickup" || fulfillment_type === "dine_in";
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

  const firstResponderDiscountPercentage =
    await firstResponderDiscountServices.getFirstResponderDiscountPercentage(
      user,
    );
  let rewardPointsDiscountPercentage = 0;
  const pointsToRedeem = payload.pointsToRedeem || 0;
  let pointsNeeded = 0;

  if (pointsToRedeem > 0) {
    if (pointsToRedeem >= 2000) {
      rewardPointsDiscountPercentage = 0.2;
      pointsNeeded = 2000;
    } else if (pointsToRedeem >= 1000) {
      rewardPointsDiscountPercentage = 0.1;
      pointsNeeded = 1000;
    } else if (pointsToRedeem >= 500) {
      rewardPointsDiscountPercentage = 0.05;
      pointsNeeded = 500;
    } else if (pointsToRedeem >= 100) {
      rewardPointsDiscountPercentage = 0.01;
      pointsNeeded = 100;
    }

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

      if (totalValidPoints < pointsNeeded) {
        throw new AppError(
          400,
          "Not enough valid reward points to redeem this tier.",
        );
      }
    }
  }

  const appliedDiscountPercentage = Math.max(
    firstResponderDiscountPercentage,
    rewardPointsDiscountPercentage,
  );

  const lineItems = payload?.items?.map((item: any) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.name,
      },
      unit_amount: (
        Number(item?.amount) *
        (1 - appliedDiscountPercentage) *
        100
      ).toFixed(0),
    },
    quantity: item.quantity,
  })) as any;

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

  const uniqueStoreShippingFees = allStoreItems.map((subArray) => subArray[0]);
  const totalShippingFee = isPickupOrDineIn
    ? 0
    : Number(
        uniqueStoreShippingFees.reduce(
          (sum, item: any) => sum + (item.shipping_fee || 0),
          0,
        ),
      )?.toFixed(2);

  if (!isPickupOrDineIn && totalShippingFee && Number(totalShippingFee) > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Shipping Fee",
        },
        unit_amount: (Number(totalShippingFee) * 100).toFixed(0),
      },
      quantity: 1,
    });
  }

  const billingData = payload.billing_address
    ? { ...payload.billing_address, user: user._id }
    : undefined;
  let shippingData = {};
  if (payload.shipping_address) {
    shippingData = { ...payload.shipping_address, user: user._id };
  } else if (!isPickupOrDineIn && billingData) {
    shippingData = { ...billingData };
  }

  const checkoutIdempotencyKey = buildCheckoutIdempotencyKey(email, {
    ...payload,
    isWeb,
  });

  const paymentSession = await stripe.checkout.sessions.create(
    {
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      customer_email: email,
      success_url: `${config.payment_success_url}?session_id={CHECKOUT_SESSION_ID}&isWeb=${isWeb}`,
      cancel_url: config.payment_cancel_url,
    },
    {
      idempotencyKey: checkoutIdempotencyKey,
    },
  );

  if (!paymentSession?.url || !paymentSession?.id) {
    throw new AppError(500, "Error creating payment session");
  }

  const existingOrder = await OrderModel.findOne({
    stripe_checkout_session_id: paymentSession.id,
  }).select("_id");

  if (existingOrder) {
    return { url: paymentSession.url };
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

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

    if (rewardPointsDiscountPercentage > 0) {
      const now = new Date();
      const validPoints =
        user.rewardPoints?.filter(
          (p) => p.expiresAt > now && p.remainingPoints > 0,
        ) || [];
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

    for (const distinctStoreItems of allStoreItems) {
      const items = distinctStoreItems?.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        discount: item.discount,
      }));
      payload.items = items;

      payload.store = (distinctStoreItems[0] as any).store;
      payload.order_id = generateOrderId();
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
      payload.fulfillment_type = fulfillment_type || "delivery";
      payload.first_responder_type = user.first_responder_type || null;
      payload.first_responder_discount_percentage =
        firstResponderDiscountPercentage;
      payload.reward_points_discount_percentage =
        rewardPointsDiscountPercentage;
      payload.applied_discount_percentage = appliedDiscountPercentage;
      payload.stripe_checkout_session_id = paymentSession.id;

      const order = await OrderModel.create([payload], { session });

      // Keep existing behavior for now.
      if (fulfillment_type === "dine_in") {
        const voucher = await voucherServices.createVoucherForOrder(order[0]);
        await OrderModel.findByIdAndUpdate(
          order[0]._id,
          { voucher: voucher._id },
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
  } catch (error: any) {
    await session.abortTransaction();

    if (error?.code === 11000) {
      const existingOrder = await OrderModel.findOne({
        stripe_checkout_session_id: paymentSession.id,
      }).select("_id");

      if (existingOrder) {
        return { url: paymentSession.url };
      }
    }

    throw new AppError(500, error.message || "Something went wrong");
  } finally {
    session.endSession();
  }

  return { url: paymentSession.url };
};

const handlePaymentSuccess = async (query: Record<string, any>) => {
  const { session_id } = query;
  const paymentSession = await stripe.checkout.sessions.retrieve(session_id);
  let orderIds: string[] = [];
  let settlementIds: string[] = [];
  let vendorTransferIds: string[] = [];
  let customerVendorChatStoreIds: any[] = [];

  if (paymentSession.payment_status === "paid") {
    const user = await UserModel.findOne({
      email: paymentSession?.customer_details?.email,
      is_deleted: false,
    });

    const commonPaymentInfo = {
      user: user?._id,
      payment_date: new Date(),
      payment_status: paymentSession.payment_status,
      currency: paymentSession.currency,
    };

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const orders = await OrderModel.find({
        stripe_checkout_session_id: session_id,
      }).session(session);

      orderIds = orders.map((order) => order._id.toString());
      customerVendorChatStoreIds = orders.map((order) => order.store);

      const settlements = await settlementServices.createSettlementsForOrders(orders as any, {
        session,
        currency: paymentSession.currency || "usd",
      });
      settlementIds = settlements.map((settlement: any) =>
        settlement._id.toString(),
      );

      if (!orders.length) {
        await session.commitTransaction();
        return { paymentSession, orderIds, settlementIds, vendorTransferIds };
      }

      const unpaidOrders = orders.filter(
        (order) => order.payment_status !== "paid",
      );

      if (unpaidOrders.length > 0) {
        const storeTotals = new Map<string, number>();
        for (const order of unpaidOrders) {
          const storeId = order.store.toString();
          storeTotals.set(storeId, (storeTotals.get(storeId) || 0) + order.total);
        }

        for (const [store, amount] of storeTotals.entries()) {
          const transaction_id = generateTransactionId();
          const paymentData = {
            transaction_id,
            store,
            amount,
          };
          await PaymentModel.create([{ ...paymentData, ...commonPaymentInfo }], {
            session,
          });
        }

        for (const currentOrder of unpaidOrders) {
          const order = await OrderModel.findByIdAndUpdate(
            currentOrder._id,
            { payment_status: "paid" },
            { session, new: true },
          );

          if (order && order.fulfillment_type === "dine_in" && !order.voucher) {
            const voucher = await voucherServices.createVoucherForOrder(order);
            await OrderModel.findByIdAndUpdate(
              currentOrder._id,
              { voucher: voucher._id },
              { session },
            );
          }
        }

        if (user) {
          const pointsEarned = Math.floor(
            (paymentSession.amount_total || 0) / 100,
          );
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
            await user.save({ session });
          }
        }
      }

      await session.commitTransaction();
    } catch (error: any) {
      await session.abortTransaction();
      throw new AppError(500, error.message || "Error creating payment");
    } finally {
      session.endSession();
    }

    if (settlementIds.length > 0) {
      const sourceTransaction = await getPaymentIntentChargeId(
        paymentSession.payment_intent,
      );
      const vendorTransfers =
        await settlementServices.transferVendorSettlements(
          settlementIds,
          stripe,
          { sourceTransaction },
        );

      vendorTransferIds = vendorTransfers
        .map((settlement: any) => settlement?.vendor_stripe_transfer_id)
        .filter(Boolean);
    }

    if (user && customerVendorChatStoreIds.length > 0) {
      await createCustomerVendorChatsForStores(
        user.email,
        customerVendorChatStoreIds,
      );
    }
  }

  return { paymentSession, orderIds, settlementIds, vendorTransferIds };
};

const handleWebhook = async (body: Buffer, signature?: string | string[]) => {
  let event: Stripe.Event;

  // Security: always verify the Stripe signature. Never trust unsigned payloads.
  if (!config.stripe_webhook_secret || !signature) {
    throw new Error(
      "Stripe webhook rejected: missing STRIPE_WEBHOOK_SECRET or stripe-signature header",
    );
  }
  event = stripe.webhooks.constructEvent(
    body,
    Array.isArray(signature) ? signature[0] : signature,
    config.stripe_webhook_secret,
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment" && session.payment_status === "paid") {
        await handlePaymentSuccess({ session_id: session.id });
      }
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await syncConnectedAccountStatus(account);
      break;
    }

    case "transfer.created":
    case "transfer.updated":
    case "transfer.reversed": {
      const transfer = event.data.object as Stripe.Transfer;
      await settlementServices.syncStripeTransferEvent(transfer);
      break;
    }

    default:
      break;
  }

  return { received: true };
};

const paymentServices = {
  createPaymentSession,
  handlePaymentSuccess,
  handleWebhook,
};

const getEarningStats = async (query: Record<string, any> = {}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalEarningResult = await PaymentModel.aggregate([
    { $match: { payment_status: "paid" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const todayEarningResult = await PaymentModel.aggregate([
    {
      $match: {
        payment_status: "paid",
        createdAt: { $gte: today },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const totalEarning = totalEarningResult[0]?.total || 0;
  const todayEarning = todayEarningResult[0]?.total || 0;

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const totalPayments = await PaymentModel.countDocuments({
    payment_status: "paid",
  });

  const paymentsWithStore = await PaymentModel.find({ payment_status: "paid" })
    .populate("user", "name email")
    .populate({
      path: "store",
      select: "name",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const storeIds = paymentsWithStore
    .map((p: any) => p.store?._id)
    .filter(Boolean);

  const vendors = await VendorModel.find({ store: { $in: storeIds } })
    .select("email store")
    .lean();

  const vendorMap = new Map();
  vendors.forEach((v: any) => vendorMap.set(v.store.toString(), v));

  const tableData = paymentsWithStore.map((payment: any) => {
    const vendor = payment.store?._id
      ? vendorMap.get(payment.store._id.toString())
      : null;
    return {
      payerName: payment.user?.name || "",
      payerEmail: payment.user?.email || "",
      amount: payment.amount,
      date: payment.createdAt,
      vendorEmail: vendor?.email || null,
      vendorName: payment.store?.name || null,
    };
  });

  return {
    totalEarning,
    todayEarning,
    tableData,
    meta: {
      total: totalPayments,
      page,
      limit,
      totalPages: Math.ceil(totalPayments / limit),
    },
  };
};

export { getEarningStats };
export default paymentServices;
