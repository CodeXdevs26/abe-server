import { ClientSession } from "mongoose";
import Stripe from "stripe";
import { AppError } from "../../classes/appError";
import { financeConfig, roundMoney } from "../../constants/finance.constant";
import { TOrder } from "../order/order.interface";
import BrokerModel from "../broker/broker.model";
import RiderModel from "../rider/rider.model";
import SettingsModel from "../settings/settings.model";
import SubscriptionModel from "../subscription/subscription.model";
import VendorModel from "../vendor/vendor.model";
import SettlementModel from "./settlement.model";

type OrderLike = TOrder & {
  _id: any;
  order_id: string;
};

const BROKER_SUBSCRIPTION_COMMISSION_RATE = 0.05;

const buildHistoryResponse = async (
  filter: Record<string, any>,
  query: Record<string, any>,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const sort = (query.sort as string) || "-createdAt";

  const [settlements, total, summaryResult] = await Promise.all([
    SettlementModel.find(filter)
      .populate("order", "order_id status payment_status fulfillment_type")
      .populate("store", "name")
      .populate("vendor", "email")
      .populate("rider", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    SettlementModel.countDocuments(filter),
    SettlementModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total_customer_paid: { $sum: "$total" },
          total_platform_order_commission: {
            $sum: "$platform_order_commission",
          },
          total_platform_service_fee: { $sum: "$platform_service_fee" },
          total_vendor_gross: { $sum: "$vendor_gross" },
          total_vendor_net: { $sum: "$vendor_net" },
          total_rider_gross: { $sum: "$rider_gross" },
          total_rider_commission: { $sum: "$rider_commission" },
          total_rider_net: { $sum: "$rider_net" },
        },
      },
    ]),
  ]);

  const summary = summaryResult[0] || {
    total_customer_paid: 0,
    total_platform_order_commission: 0,
    total_platform_service_fee: 0,
    total_vendor_gross: 0,
    total_vendor_net: 0,
    total_rider_gross: 0,
    total_rider_commission: 0,
    total_rider_net: 0,
  };

  delete summary._id;

  return {
    data: settlements,
    summary,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const buildEarningResponse = async (
  filter: Record<string, any>,
  query: Record<string, any>,
  role: "vendor" | "rider",
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const sort = (query.sort as string) || "-createdAt";

  const [settlements, total] = await Promise.all([
    SettlementModel.find(filter)
      .populate("customer", "name image")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    SettlementModel.countDocuments(filter),
  ]);

  const data = settlements.map((settlement: any) => {
    const payer = settlement.customer || {};

    return {
      payer_name: payer.name || null,
      payer_image: payer.image || null,
      transaction_id:
        role === "vendor"
          ? settlement.vendor_stripe_transfer_id
          : settlement.rider_stripe_transfer_id,
      date: settlement.createdAt,
      amount: role === "vendor" ? settlement.vendor_net : settlement.rider_net,
      company_fee:
        role === "vendor"
          ? settlement.platform_order_commission
          : settlement.rider_commission,
    };
  });

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const calculateOrderSplit = (
  order: Pick<
    TOrder,
    "subtotal" | "shipping_fee" | "total" | "fulfillment_type"
  >,
  serviceFee = 0,
) => {
  const vendorGross = roundMoney(Number(order.subtotal || 0));
  const platformOrderCommission = roundMoney(
    vendorGross * financeConfig.platformOrderCommissionRate,
  );
  const vendorNet = roundMoney(vendorGross - platformOrderCommission);
  const riderGross =
    order.fulfillment_type === "delivery"
      ? roundMoney(Number(order.shipping_fee || 0))
      : 0;
  const riderCommission = roundMoney(
    riderGross * financeConfig.riderDeliveryCommissionRate,
  );
  const riderNet = roundMoney(riderGross - riderCommission);
  const platformServiceFee = roundMoney(serviceFee);

  return {
    service_fee: platformServiceFee,
    platform_order_commission_rate: financeConfig.platformOrderCommissionRate,
    rider_delivery_commission_rate: financeConfig.riderDeliveryCommissionRate,
    platform_order_commission: platformOrderCommission,
    platform_service_fee: platformServiceFee,
    vendor_gross: vendorGross,
    vendor_net: vendorNet,
    rider_gross: riderGross,
    rider_commission: riderCommission,
    rider_net: riderNet,
    vendor_transfer_status: "pending" as const,
    rider_transfer_status:
      riderGross > 0 ? ("pending" as const) : ("not_applicable" as const),
    total: roundMoney(Number(order.total || 0)),
    shipping_fee: roundMoney(Number(order.shipping_fee || 0)),
    subtotal: vendorGross,
  };
};

const createSettlementForOrder = async (
  order: OrderLike,
  options: { session?: ClientSession; currency?: string; serviceFee?: number } = {},
) => {
  const vendor = await VendorModel.findOne({
    store: order.store,
    is_deleted: false,
  })
    .select("_id")
    .session(options.session || null);

  const split = calculateOrderSplit(order, options.serviceFee || 0);

  return SettlementModel.findOneAndUpdate(
    { order: order._id },
    {
      $setOnInsert: {
        order: order._id,
        order_id: order.order_id,
        customer: order.customer,
        store: order.store,
        vendor: vendor?._id || null,
        rider: null,
        currency: options.currency || "usd",
        ...split,
        vendor_stripe_transfer_id: null,
        rider_stripe_transfer_id: null,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      session: options.session,
    },
  );
};

const createSettlementsForOrders = async (
  orders: OrderLike[],
  options: { session?: ClientSession; currency?: string; serviceFee?: number } = {},
) => {
  const settlements = [];

  for (const order of orders) {
    const settlement = await createSettlementForOrder(order, options);
    settlements.push(settlement);
  }

  return settlements;
};

const toStripeAmount = (amount: number) => Math.round(amount * 100);

const markVendorTransferFailed = async (settlementId: any, message: string) =>
  SettlementModel.findByIdAndUpdate(
    settlementId,
    {
      vendor_transfer_status: "failed",
      vendor_transfer_error: message,
    },
    { new: true },
  );

const markRiderTransferFailed = async (settlementId: any, message: string) =>
  SettlementModel.findByIdAndUpdate(
    settlementId,
    {
      rider_transfer_status: "failed",
      rider_transfer_error: message,
    },
    { new: true },
  );

const transferVendorSettlement = async (
  settlementId: any,
  stripe: Stripe,
  options: { sourceTransaction?: string | null } = {},
) => {
  const settlement = await SettlementModel.findById(settlementId).populate({
    path: "vendor",
    select:
      "stripe_connect_account_id stripe_connect_onboarding_completed stripe_connect_charges_enabled stripe_connect_payouts_enabled",
  });

  if (!settlement) return null;
  if (
    settlement.vendor_transfer_status === "transferred" &&
    settlement.vendor_stripe_transfer_id
  ) {
    return settlement;
  }

  const vendor: any = settlement.vendor;
  if (!vendor?.stripe_connect_account_id) {
    return markVendorTransferFailed(
      settlement._id,
      "Vendor Stripe Connect account is missing",
    );
  }

  if (
    !vendor.stripe_connect_onboarding_completed ||
    !vendor.stripe_connect_charges_enabled ||
    !vendor.stripe_connect_payouts_enabled
  ) {
    return markVendorTransferFailed(
      settlement._id,
      "Vendor Stripe Connect account is not ready for transfers",
    );
  }

  const amount = toStripeAmount(settlement.vendor_net);
  if (amount <= 0) {
    return SettlementModel.findByIdAndUpdate(
      settlement._id,
      {
        vendor_transfer_status: "not_applicable",
        vendor_transfer_error: null,
      },
      { new: true },
    );
  }

  try {
    const transfer = await stripe.transfers.create(
      {
        amount,
        currency: settlement.currency,
        destination: vendor.stripe_connect_account_id,
        source_transaction: options.sourceTransaction || undefined,
        transfer_group: settlement.order_id,
        metadata: {
          settlement_id: settlement._id.toString(),
          order: settlement.order.toString(),
          order_id: settlement.order_id,
          recipient_role: "vendor",
        },
      },
      {
        idempotencyKey: `vendor-transfer-${settlement._id.toString()}`,
      },
    );

    return SettlementModel.findByIdAndUpdate(
      settlement._id,
      {
        vendor_stripe_transfer_id: transfer.id,
        vendor_transfer_status: "transferred",
        vendor_transfer_error: null,
      },
      { new: true },
    );
  } catch (error: any) {
    return markVendorTransferFailed(
      settlement._id,
      error?.message || "Vendor Stripe transfer failed",
    );
  }
};

const transferVendorSettlements = async (
  settlementIds: any[],
  stripe: Stripe,
  options: { sourceTransaction?: string | null } = {},
) => {
  const settlements = [];

  for (const settlementId of settlementIds) {
    const settlement = await transferVendorSettlement(settlementId, stripe, options);
    settlements.push(settlement);
  }

  return settlements;
};

const transferRiderSettlementByOrder = async (
  orderId: any,
  riderId: any,
  stripe: Stripe,
) => {
  const settlement = await SettlementModel.findOne({ order: orderId });

  if (!settlement) return null;
  if (
    settlement.rider_transfer_status === "transferred" &&
    settlement.rider_stripe_transfer_id
  ) {
    return settlement;
  }

  const rider = await RiderModel.findOne({
    _id: riderId,
    is_deleted: false,
    is_blocked: false,
  }).select(
    "stripe_connect_account_id stripe_connect_onboarding_completed stripe_connect_charges_enabled stripe_connect_payouts_enabled",
  );

  if (!rider?.stripe_connect_account_id) {
    await SettlementModel.findByIdAndUpdate(settlement._id, { rider: riderId });
    return markRiderTransferFailed(
      settlement._id,
      "Rider Stripe Connect account is missing",
    );
  }

  if (
    !rider.stripe_connect_onboarding_completed ||
    !rider.stripe_connect_charges_enabled ||
    !rider.stripe_connect_payouts_enabled
  ) {
    await SettlementModel.findByIdAndUpdate(settlement._id, { rider: riderId });
    return markRiderTransferFailed(
      settlement._id,
      "Rider Stripe Connect account is not ready for transfers",
    );
  }

  const amount = toStripeAmount(settlement.rider_net);
  if (amount <= 0) {
    return SettlementModel.findByIdAndUpdate(
      settlement._id,
      {
        rider: riderId,
        rider_transfer_status: "not_applicable",
        rider_transfer_error: null,
      },
      { new: true },
    );
  }

  try {
    const transfer = await stripe.transfers.create(
      {
        amount,
        currency: settlement.currency,
        destination: rider.stripe_connect_account_id,
        transfer_group: settlement.order_id,
        metadata: {
          settlement_id: settlement._id.toString(),
          order: settlement.order.toString(),
          order_id: settlement.order_id,
          rider: riderId.toString(),
          recipient_role: "rider",
        },
      },
      {
        idempotencyKey: `rider-transfer-${settlement._id.toString()}`,
      },
    );

    return SettlementModel.findByIdAndUpdate(
      settlement._id,
      {
        rider: riderId,
        rider_stripe_transfer_id: transfer.id,
        rider_transfer_status: "transferred",
        rider_transfer_error: null,
      },
      { new: true },
    );
  } catch (error: any) {
    await SettlementModel.findByIdAndUpdate(settlement._id, { rider: riderId });
    return markRiderTransferFailed(
      settlement._id,
      error?.message || "Rider Stripe transfer failed",
    );
  }
};

const syncStripeTransferEvent = async (transfer: Stripe.Transfer) => {
  const settlementId = transfer.metadata?.settlement_id;
  const recipientRole = transfer.metadata?.recipient_role;
  const filter = settlementId
    ? { _id: settlementId }
    : {
        $or: [
          { vendor_stripe_transfer_id: transfer.id },
          { rider_stripe_transfer_id: transfer.id },
        ],
      };

  if (recipientRole === "vendor") {
    return SettlementModel.findOneAndUpdate(
      filter,
      {
        vendor_stripe_transfer_id: transfer.id,
        vendor_transfer_status: transfer.reversed ? "failed" : "transferred",
        vendor_transfer_error: transfer.reversed
          ? "Stripe transfer was reversed"
          : null,
      },
      { new: true },
    );
  }

  if (recipientRole === "rider") {
    return SettlementModel.findOneAndUpdate(
      filter,
      {
        rider_stripe_transfer_id: transfer.id,
        rider_transfer_status: transfer.reversed ? "failed" : "transferred",
        rider_transfer_error: transfer.reversed
          ? "Stripe transfer was reversed"
          : null,
      },
      { new: true },
    );
  }

  return null;
};

const getVendorSettlementHistory = async (
  email: string,
  query: Record<string, any>,
) => {
  const vendor = await VendorModel.findOne({
    email,
    is_deleted: false,
    is_blocked: false,
  }).select("_id");

  if (!vendor) {
    throw new AppError(404, "Vendor not found");
  }

  return buildHistoryResponse({ vendor: vendor._id }, query);
};

const getVendorEarnings = async (email: string, query: Record<string, any>) => {
  const vendor = await VendorModel.findOne({
    email,
    is_deleted: false,
    is_blocked: false,
  }).select("_id");

  if (!vendor) {
    throw new AppError(404, "Vendor not found");
  }

  return buildEarningResponse({ vendor: vendor._id }, query, "vendor");
};

const getRiderSettlementHistory = async (
  email: string,
  query: Record<string, any>,
) => {
  const rider = await RiderModel.findOne({
    email,
    is_deleted: false,
    is_blocked: false,
  }).select("_id");

  if (!rider) {
    throw new AppError(404, "Rider not found");
  }

  return buildHistoryResponse({ rider: rider._id }, query);
};

const getRiderEarnings = async (email: string, query: Record<string, any>) => {
  const rider = await RiderModel.findOne({
    email,
    is_deleted: false,
    is_blocked: false,
  }).select("_id");

  if (!rider) {
    throw new AppError(404, "Rider not found");
  }

  return buildEarningResponse({ rider: rider._id }, query, "rider");
};

const getBrokerEarnings = async (email: string, query: Record<string, any>) => {
  const broker = await BrokerModel.findOne({
    email,
    is_deleted: false,
    is_blocked: false,
  }).select("_id referral_code");

  if (!broker) {
    throw new AppError(404, "Broker not found");
  }

  const referredVendors = await VendorModel.find({
    broker_referral: broker.referral_code,
    is_deleted: false,
    is_blocked: false,
  })
    .populate("store", "name cover_images")
    .select("email store")
    .lean();

  const vendorEmails = referredVendors.map((vendor) => vendor.email);

  if (!vendorEmails.length) {
    return {
      data: [],
      meta: {
        total: 0,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: 0,
      },
    };
  }

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const sort = (query.sort as string) || "-createdAt";
  const settings = await SettingsModel.findOne().sort({ createdAt: -1 });
  const subscriptionAmount = roundMoney(
    Number(settings?.vendor_monthly_subscription_fee || 0),
  );
  const brokerAmount = roundMoney(
    subscriptionAmount * BROKER_SUBSCRIPTION_COMMISSION_RATE,
  );
  const companyFee = roundMoney(subscriptionAmount - brokerAmount);
  const vendorMap = new Map(
    referredVendors.map((vendor: any) => [vendor.email, vendor]),
  );

  const filter = {
    email: { $in: vendorEmails },
    role: "vendor",
    status: "active",
    is_deleted: false,
  };

  const [subscriptions, total] = await Promise.all([
    SubscriptionModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    SubscriptionModel.countDocuments(filter),
  ]);

  const data = subscriptions.map((subscription) => {
    const vendor: any = vendorMap.get(subscription.email) || {};
    const store = vendor.store || {};

    return {
      payer_name: store.name || subscription.email,
      payer_image: store.cover_images?.[0] || null,
      transaction_id:
        subscription.stripe_subscription_id ||
        subscription.stripe_checkout_session_id ||
        null,
      date:
        subscription.current_period_start ||
        subscription.current_period_end ||
        null,
      amount: brokerAmount,
      company_fee: companyFee,
    };
  });

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAdminSettlementOverview = async (query: Record<string, any>) =>
  buildHistoryResponse({}, query);

const getSettlementByOrder = async (
  orderId: string,
  currentUser: { role: string; email: string },
) => {
  const filter: Record<string, any> = { order: orderId };

  if (currentUser.role === "vendor") {
    const vendor = await VendorModel.findOne({
      email: currentUser.email,
      is_deleted: false,
      is_blocked: false,
    }).select("_id");

    if (!vendor) {
      throw new AppError(404, "Vendor not found");
    }

    filter.vendor = vendor._id;
  }

  if (currentUser.role === "rider") {
    const rider = await RiderModel.findOne({
      email: currentUser.email,
      is_deleted: false,
      is_blocked: false,
    }).select("_id");

    if (!rider) {
      throw new AppError(404, "Rider not found");
    }

    filter.rider = rider._id;
  }

  return SettlementModel.findOne(filter)
    .populate("order", "order_id status payment_status fulfillment_type")
    .populate("store", "name")
    .populate("vendor", "email")
    .populate("rider", "name email");
};

const settlementServices = {
  calculateOrderSplit,
  createSettlementForOrder,
  createSettlementsForOrders,
  transferVendorSettlement,
  transferVendorSettlements,
  transferRiderSettlementByOrder,
  syncStripeTransferEvent,
  getVendorSettlementHistory,
  getVendorEarnings,
  getRiderSettlementHistory,
  getRiderEarnings,
  getBrokerEarnings,
  getAdminSettlementOverview,
  getSettlementByOrder,
};

export default settlementServices;
