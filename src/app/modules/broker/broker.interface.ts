export type TBroker = {
  name: string;
  image: string | null;
  referral_code?: string | null;
  referral_users: number;
  email: string;
  location: string;
  balance: number;
  contact: string;
  stripe_connect_account_id?: string | null;
  stripe_connect_onboarding_completed?: boolean;
  stripe_connect_charges_enabled?: boolean;
  stripe_connect_payouts_enabled?: boolean;
  is_approved?: boolean;
  is_deleted?: boolean;
  is_blocked?: boolean;
};
