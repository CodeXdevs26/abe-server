export const buildStripeConnectStatus = (owner: {
  stripe_connect_account_id?: string | null;
  stripe_connect_onboarding_completed?: boolean;
  stripe_connect_charges_enabled?: boolean;
  stripe_connect_payouts_enabled?: boolean;
}) => {
  const onboardingCompleted = !!owner.stripe_connect_onboarding_completed;
  const chargesEnabled = !!owner.stripe_connect_charges_enabled;
  const payoutsEnabled = !!owner.stripe_connect_payouts_enabled;

  return {
    has_stripe_connect_account: !!owner.stripe_connect_account_id,
    is_payout_ready:
      !!owner.stripe_connect_account_id &&
      onboardingCompleted &&
      chargesEnabled &&
      payoutsEnabled,
    stripe_connect_account_id: owner.stripe_connect_account_id || null,
    stripe_connect_onboarding_completed: onboardingCompleted,
    stripe_connect_charges_enabled: chargesEnabled,
    stripe_connect_payouts_enabled: payoutsEnabled,
  };
};
