import Stripe from "stripe";
import { AppError } from "../../classes/appError";
import config from "../../config";
import BrokerModel from "../broker/broker.model";
import RiderModel from "../rider/rider.model";
import VendorModel from "../vendor/vendor.model";

type ConnectRole = "vendor" | "rider" | "broker";

const formatRoleName = (role: ConnectRole) =>
  role.charAt(0).toUpperCase() + role.slice(1);

const stripe = new Stripe(config.stripe_secret_key as string, {
  apiVersion: "2025-01-27.acacia",
});

const getStripeErrorMessage = (error: unknown) => {
  if (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.message.includes("signed up for Connect")
  ) {
    return "Stripe Connect is not enabled for this Stripe account. Please enable Connect from the Stripe dashboard before creating onboarding links.";
  }

  if (error instanceof Stripe.errors.StripeError && error.message) {
    return error.message;
  }

  return "Unable to create Stripe Connect onboarding link";
};

export const getOwnerByRole = async (role: ConnectRole, email: string) => {
  const query = {
    email,
    is_deleted: false,
    is_blocked: false,
  };

  if (role === "vendor") {
    return VendorModel.findOne(query);
  }

  if (role === "broker") {
    return BrokerModel.findOne(query);
  }

  return RiderModel.findOne(query);
};

export const updateOwnerConnectStatus = async (
  role: ConnectRole,
  ownerId: string,
  account: Stripe.Account,
) => {
  const update = {
    stripe_connect_account_id: account.id,
    stripe_connect_onboarding_completed: !!account.details_submitted,
    stripe_connect_charges_enabled: !!account.charges_enabled,
    stripe_connect_payouts_enabled: !!account.payouts_enabled,
  };

  if (role === "vendor") {
    await VendorModel.findByIdAndUpdate(ownerId, update, { new: true });
  } else if (role === "broker") {
    await BrokerModel.findByIdAndUpdate(ownerId, update, { new: true });
  } else {
    await RiderModel.findByIdAndUpdate(ownerId, update, { new: true });
  }

  return update;
};

export const buildConnectStatusResponse = (
  accountId: string | null,
  status: {
    stripe_connect_onboarding_completed?: boolean;
    stripe_connect_charges_enabled?: boolean;
    stripe_connect_payouts_enabled?: boolean;
  },
  requirements?: Stripe.Account.Requirements | null,
) => {
  const currentlyDue = requirements?.currently_due || [];
  const pastDue = requirements?.past_due || [];
  const pendingVerification = requirements?.pending_verification || [];
  const requiredFieldsMissing = Array.from(
    new Set([...currentlyDue, ...pastDue]),
  );
  const onboardingCompleted = !!status.stripe_connect_onboarding_completed;
  const chargesEnabled = !!status.stripe_connect_charges_enabled;
  const payoutsEnabled = !!status.stripe_connect_payouts_enabled;

  return {
    has_stripe_connect_account: !!accountId,
    is_payout_ready:
      !!accountId &&
      onboardingCompleted &&
      chargesEnabled &&
      payoutsEnabled &&
      requiredFieldsMissing.length === 0,
    stripe_connect_account_id: accountId,
    stripe_connect_onboarding_completed: onboardingCompleted,
    stripe_connect_charges_enabled: chargesEnabled,
    stripe_connect_payouts_enabled: payoutsEnabled,
    required_fields_missing: requiredFieldsMissing,
    pending_verification_fields: pendingVerification,
    requirements: requirements
      ? {
          currently_due: currentlyDue,
          eventually_due: requirements.eventually_due || [],
          past_due: pastDue,
          pending_verification: pendingVerification,
          disabled_reason: requirements.disabled_reason || null,
        }
      : null,
  };
};

const createOrReuseConnectedAccount = async (
  role: ConnectRole,
  email: string,
) => {
  const owner = await getOwnerByRole(role, email);
  if (!owner) {
    throw new AppError(404, `${formatRoleName(role)} not found`);
  }

  if (owner.stripe_connect_account_id) {
    const account = await stripe.accounts.retrieve(
      owner.stripe_connect_account_id,
    );
    const status = await updateOwnerConnectStatus(
      role,
      owner._id.toString(),
      account,
    );

    return buildConnectStatusResponse(account.id, status, account.requirements);
  }

  let account: Stripe.Account;
  try {
    account = await stripe.accounts.create({
      type: "express",
      email,
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
      metadata: {
        role,
        owner_id: owner._id.toString(),
        email,
      },
    });
  } catch (error) {
    throw new AppError(400, getStripeErrorMessage(error));
  }

  const status = await updateOwnerConnectStatus(
    role,
    owner._id.toString(),
    account,
  );

  return buildConnectStatusResponse(account.id, status, account.requirements);
};

const createOnboardingLink = async (
  role: ConnectRole,
  email: string,
  payload: { return_url?: string; refresh_url?: string } = {},
) => {
  const accountStatus = await createOrReuseConnectedAccount(role, email);
  const accountId = accountStatus.stripe_connect_account_id;
  const returnUrl =
    payload.return_url ||
    config.stripe_connect_return_url ||
    config.payment_success_url_web;
  const refreshUrl =
    payload.refresh_url || config.stripe_connect_refresh_url || returnUrl;

  if (!accountId || !returnUrl || !refreshUrl) {
    throw new AppError(500, "Stripe Connect redirect URLs are not configured");
  }

  let accountLink: Stripe.AccountLink;
  try {
    accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
  } catch (error) {
    throw new AppError(400, getStripeErrorMessage(error));
  }

  return {
    ...accountStatus,
    url: accountLink.url,
    expires_at: accountLink.expires_at,
  };
};

const getConnectedAccountStatus = async (role: ConnectRole, email: string) => {
  const owner = await getOwnerByRole(role, email);
  if (!owner) {
    throw new AppError(404, `${formatRoleName(role)} not found`);
  }

  if (!owner.stripe_connect_account_id) {
    return buildConnectStatusResponse(null, {});
  }

  const account = await stripe.accounts.retrieve(
    owner.stripe_connect_account_id,
  );
  const status = await updateOwnerConnectStatus(
    role,
    owner._id.toString(),
    account,
  );

  return buildConnectStatusResponse(account.id, status, account.requirements);
};

const stripeConnectServices = {
  createOrReuseConnectedAccount,
  createOnboardingLink,
  getConnectedAccountStatus,
};

export default stripeConnectServices;
