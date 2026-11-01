import Stripe from "stripe";
import { AppError } from "../../classes/appError";
import config from "../../config";
import SettingsModel from "../settings/settings.model";
import BrokerModel from "../broker/broker.model";
import RiderModel from "../rider/rider.model";
import VendorModel from "../vendor/vendor.model";
import SubscriptionModel from "./subscription.model";
import {
  TSubscriptionRole,
  TSubscriptionStatus,
} from "./subscription.interface";

const stripe = new Stripe(config.stripe_secret_key as string, {
  apiVersion: "2025-01-27.acacia",
});

const supportedRoles: TSubscriptionRole[] = ["broker", "rider", "vendor"];
const activeStatuses: TSubscriptionStatus[] = ["active", "trialing"];

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

const appendSessionId = (url: string) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}session_id={CHECKOUT_SESSION_ID}`;
};

const getOwnerByRoleAndEmail = async (
  role: TSubscriptionRole,
  email: string,
): Promise<any> => {
  const query = { email, is_deleted: false, is_blocked: false };

  if (role === "broker") {
    return BrokerModel.findOne(query);
  }

  if (role === "rider") {
    return RiderModel.findOne(query);
  }

  return VendorModel.findOne(query);
};

const getSubscriptionFeeByRole = async (
  role: TSubscriptionRole,
  { throwIfMissing = true }: { throwIfMissing?: boolean } = {},
) => {
  const settings = await SettingsModel.findOne().sort({ createdAt: -1 });

  if (!settings) {
    if (throwIfMissing) {
      throw new AppError(404, "Subscription settings not found");
    }

    return 0;
  }

  const priceMap = {
    broker: settings.broker_monthly_subscription_fee,
    rider: settings.rider_monthly_subscription_fee,
    vendor: settings.vendor_monthly_subscription_fee,
  };

  const fee = Number(priceMap[role] || 0);

  if (fee <= 0 && throwIfMissing) {
    throw new AppError(
      400,
      `${capitalize(role)} subscription fee is not configured yet`,
    );
  }

  return fee;
};

const buildSubscriptionResponse = async (
  email: string,
  role: TSubscriptionRole,
) => {
  const subscription = await SubscriptionModel.findOne({
    email,
    role,
    is_deleted: false,
  });
  const fee = await getSubscriptionFeeByRole(role, { throwIfMissing: false });
  const isActive = !!(
    subscription &&
    activeStatuses.includes(subscription.status) &&
    (!subscription.current_period_end ||
      subscription.current_period_end >= new Date())
  );

  return {
    role,
    monthly_fee: fee,
    has_active_subscription: isActive,
    subscription_status: subscription?.status || "inactive",
    current_period_start: subscription?.current_period_start || null,
    current_period_end: subscription?.current_period_end || null,
    cancel_at_period_end: subscription?.cancel_at_period_end || false,
    subscription,
  };
};

const getRoleSubscriptionSummary = async (
  email: string,
  role: TSubscriptionRole,
) => {
  if (!supportedRoles.includes(role)) return null;

  const owner = await getOwnerByRoleAndEmail(role, email);
  if (!owner) {
    throw new AppError(404, `${capitalize(role)} not found`);
  }

  return buildSubscriptionResponse(email, role);
};

const createCheckoutSession = async (
  email: string,
  role: TSubscriptionRole,
) => {
  if (!supportedRoles.includes(role)) {
    throw new AppError(403, "This role does not support subscriptions");
  }

  const owner = await getOwnerByRoleAndEmail(role, email);

  if (!owner) {
    throw new AppError(404, `${capitalize(role)} not found`);
  }

  const amount = await getSubscriptionFeeByRole(role);
  const existingSubscription = await SubscriptionModel.findOne({
    email,
    role,
    is_deleted: false,
  });

  const alreadyActive =
    existingSubscription &&
    activeStatuses.includes(existingSubscription.status) &&
    (!existingSubscription.current_period_end ||
      existingSubscription.current_period_end >= new Date());

  if (alreadyActive) {
    throw new AppError(400, "Subscription is already active");
  }

  let stripeCustomerId = existingSubscription?.stripe_customer_id || null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email,
      name: owner.name || owner.store_name || capitalize(role),
      metadata: {
        role,
        owner_id: owner._id.toString(),
      },
    });
    stripeCustomerId = customer.id;
  }

  const successUrlBase = config.subscription_success_url;
  console.log("successUrlBase", successUrlBase);
  if (!successUrlBase) {
    throw new AppError(
      500,
      "Subscription redirect URLs are missing or invalid",
    );
  }
  const cancelUrl = config.subscription_cancel_url;
  if (!successUrlBase || !cancelUrl) {
    throw new AppError(
      500,
      "Subscription redirect URLs are missing or invalid",
    );
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    client_reference_id: owner._id.toString(),
    metadata: {
      email,
      role,
      owner_id: owner._id.toString(),
    },
    subscription_data: {
      metadata: {
        email,
        role,
        owner_id: owner._id.toString(),
      },
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(amount * 100),
          recurring: {
            interval: "month",
          },
          product_data: {
            name: `${capitalize(role)} Monthly Subscription`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: appendSessionId(successUrlBase),
    cancel_url: cancelUrl,
  });

  await SubscriptionModel.findOneAndUpdate(
    { email, role },
    {
      email,
      role,
      owner_id: owner._id,
      stripe_customer_id: stripeCustomerId,
      stripe_checkout_session_id: checkoutSession.id,
      status: existingSubscription?.status || "inactive",
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  if (!checkoutSession.url) {
    throw new AppError(500, "Error creating subscription session");
  }

  return {
    url: checkoutSession.url,
  };
};

const findExistingSubscription = async (
  stripeSubscriptionId: string,
  stripeCustomerId: string,
  email?: string | null,
  role?: string | null,
) => {
  const subscription = await SubscriptionModel.findOne({
    $or: [
      { stripe_subscription_id: stripeSubscriptionId },
      { stripe_customer_id: stripeCustomerId },
      ...(email && role ? [{ email, role }] : []),
    ],
    is_deleted: false,
  });

  return subscription;
};

const syncSubscriptionFromStripe = async (
  stripeSubscription: Stripe.Subscription,
  extra?: {
    checkoutSessionId?: string;
    email?: string | null;
    role?: string | null;
    ownerId?: string | null;
  },
) => {
  const stripeCustomerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  const existingSubscription = await findExistingSubscription(
    stripeSubscription.id,
    stripeCustomerId,
    extra?.email || stripeSubscription.metadata.email,
    extra?.role || stripeSubscription.metadata.role,
  );

  const role = (stripeSubscription.metadata.role ||
    extra?.role ||
    existingSubscription?.role) as TSubscriptionRole | undefined;
  const email =
    stripeSubscription.metadata.email ||
    extra?.email ||
    existingSubscription?.email;
  const ownerId =
    stripeSubscription.metadata.owner_id ||
    extra?.ownerId ||
    existingSubscription?.owner_id?.toString();

  if (!role || !email || !ownerId) {
    throw new AppError(400, "Unable to map Stripe subscription to user");
  }

  const firstItem = stripeSubscription.items.data[0];

  await SubscriptionModel.findOneAndUpdate(
    existingSubscription?._id
      ? { _id: existingSubscription._id }
      : { email, role },
    {
      email,
      role,
      owner_id: ownerId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscription.id,
      stripe_price_id: firstItem?.price?.id || null,
      stripe_product_id:
        typeof firstItem?.price?.product === "string"
          ? firstItem.price.product
          : firstItem?.price?.product?.id || null,
      stripe_checkout_session_id:
        extra?.checkoutSessionId ||
        existingSubscription?.stripe_checkout_session_id ||
        null,
      status: stripeSubscription.status as TSubscriptionStatus,
      current_period_start: new Date(
        stripeSubscription.current_period_start * 1000,
      ),
      current_period_end: new Date(
        stripeSubscription.current_period_end * 1000,
      ),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );
};

const handleWebhook = async (body: Buffer, signature?: string | string[]) => {
  let event: Stripe.Event;

  if (config.stripe_webhook_secret && signature) {
    event = stripe.webhooks.constructEvent(
      body,
      Array.isArray(signature) ? signature[0] : signature,
      config.stripe_webhook_secret,
    );
  } else {
    event = JSON.parse(body.toString()) as Stripe.Event;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );

        await syncSubscriptionFromStripe(subscription, {
          checkoutSessionId: session.id,
          email: session.customer_email || session.customer_details?.email,
          role: session.metadata?.role || null,
          ownerId: session.metadata?.owner_id || null,
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscriptionFromStripe(subscription);
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;

      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string,
        );
        await syncSubscriptionFromStripe(subscription);
      }
      break;
    }

    default:
      break;
  }

  return { received: true };
};

const isRoleSubscriptionActive = async (
  email: string,
  role: TSubscriptionRole,
) => {
  const subscription = await SubscriptionModel.findOne({
    email,
    role,
    is_deleted: false,
  });

  if (!subscription) return false;

  return (
    activeStatuses.includes(subscription.status) &&
    (!subscription.current_period_end ||
      subscription.current_period_end >= new Date())
  );
};

const handleSubscriptionSuccess = async (query: Record<string, any>) => {
  const { session_id, isWeb } = query;

  if (!session_id) {
    return { success: false, message: "No session ID provided" };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid" && session.mode === "subscription") {
      const subscription = session.subscription
        ? await stripe.subscriptions.retrieve(session.subscription as string)
        : null;

      const email = session.customer_email || session.customer_details?.email;
      const role = session.metadata?.role as TSubscriptionRole | undefined;

      if (email && role && subscription) {
        await syncSubscriptionFromStripe(subscription, {
          checkoutSessionId: session.id,
          email,
          role,
          ownerId: session.metadata?.owner_id || null,
        });
      }

      return {
        success: true,
        message: "Subscription activated successfully",
        subscription: {
          status: session.payment_status,
          mode: session.mode,
          email: email,
          role: role,
        },
        redirect: isWeb === "true" ? true : false,
      };
    }

    return {
      success: false,
      message: "Payment not completed",
      subscription: {
        status: session.payment_status,
        mode: session.mode,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to verify subscription",
    };
  }
};

const subscriptionServices = {
  createCheckoutSession,
  handleWebhook,
  getRoleSubscriptionSummary,
  isRoleSubscriptionActive,
  handleSubscriptionSuccess,
};

export default subscriptionServices;
