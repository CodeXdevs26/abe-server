import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join((process.cwd(), ".env")) });

const toNumber = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default {
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  node_env: process.env.NODE_ENV,
  salt_rounds: process.env.SALT_ROUNDS,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_access_expiration: process.env.JWT_ACCESS_EXPIRATION,
  jwt_refresh_expiration: process.env.JWT_REFRESH_EXPIRATION,
  admin_email: process.env.ADMIN_EMAIL,
  emailSendingApi: process.env.SEND_EMAIL_URL,
  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  stripe_connect_return_url: process.env.STRIPE_CONNECT_RETURN_URL,
  stripe_connect_refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL,
  payment_success_url: process.env.PAYMENT_SUCCESS_URL,
  payment_cancel_url: process.env.PAYMENT_CANCEL_URL,
  payment_success_url_web: process.env.PAYMENT_SUCCESS_URL_WEB,
  subscription_success_url: process.env.SUBSCRIPTION_SUCCESS_URL,
  subscription_cancel_url: process.env.SUBSCRIPTION_CANCEL_URL,
  platform_order_commission_percent: toNumber(
    process.env.PLATFORM_ORDER_COMMISSION_PERCENT,
  ),
  rider_delivery_commission_percent: toNumber(
    process.env.RIDER_DELIVERY_COMMISSION_PERCENT,
  ),
  customer_service_fee: toNumber(process.env.CUSTOMER_SERVICE_FEE),
  service_fee_reward_tier_percent: toNumber(
    process.env.SERVICE_FEE_REWARD_TIER_PERCENT,
  ),
  aws: {
    accessKeyId: process.env.S3_BUCKET_ACCESS_KEY,
    secretAccessKey: process.env.S3_BUCKET_SECRET_ACCESS_KEY,
    s3BaseUrl: process.env.S3_BASE_URL,
    s3_api: process.env.S3_API,
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_BUCKET_NAME,
    endpoint: process.env.SPACES_API,
  },
};
