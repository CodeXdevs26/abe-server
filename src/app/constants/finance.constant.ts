import config from "../config";

const percentToRate = (value: number, fallback: number) =>
  (Number.isFinite(value) && value > 0 ? value : fallback) / 100;

export const financeConfig = {
  platformOrderCommissionRate: percentToRate(
    config.platform_order_commission_percent,
    5,
  ),
  riderDeliveryCommissionRate: percentToRate(
    config.rider_delivery_commission_percent,
    5,
  ),
  customerServiceFee:
    Number.isFinite(config.customer_service_fee) && config.customer_service_fee > 0
      ? config.customer_service_fee
      : 1,
  serviceFeeRewardTierRate: percentToRate(
    config.service_fee_reward_tier_percent,
    10,
  ),
};

export const roundMoney = (amount: number) => Number(amount.toFixed(2));
