import { Router } from "express";
import authRouters from "../modules/auth/auth.routes";
import adminRouters from "../modules/admin/admin.routes";
import userRouters from "../modules/user/user.routes";
import categoryRouters from "../modules/category/category.routes";
import riderRouters from "../modules/rider/rider.routes";
import vendorRouters from "../modules/vendor/vendor.routes";
import storeRouters from "../modules/store/store.routes";
import brokerRouters from "../modules/broker/broker.routes";
import productRouters from "../modules/product/product.routes";
import reviewRouters from "../modules/reviews/review.routes";
import cartRouter from "../modules/cart/cart.routes";
import orderRouters from "../modules/order/order.routes";
import pickupRequestRouters from "../modules/pickup-request/pickup-request.routes";
import { settingsRoutes } from "../modules/settings/settings.routes";
import billingRouters from "../modules/billing/billing.routes";
import supportRouters from "../modules/support/support.routes";
import paymentRouters from "../modules/payment/payment.routes";
import { shippingRoutes } from "../modules/shipping/shipping.routes";
import subscriptionRouters from "../modules/subscription/subscription.routes";
import chatRouters from "../modules/chat/chat.routes";
import { summaryRoutes } from "../modules/summary/summary.routes";
import bannerRouters from "../modules/banner/banner.routes";
import voucherRouters from "../modules/voucher/voucher.routes";
import stripeConnectRouters from "../modules/stripe-connect/stripe-connect.routes";
import settlementRouters from "../modules/settlement/settlement.routes";
import firstResponderDiscountRouters from "../modules/first-responder-discount/first-responder-discount.routes";

const router = Router();

const apiRoutes = [
  { path: "/auth", route: authRouters },
  { path: "/admins", route: adminRouters },
  { path: "/categories", route: categoryRouters },
  { path: "/users", route: userRouters },
  { path: "/riders", route: riderRouters },
  { path: "/vendors", route: vendorRouters },
  { path: "/stores", route: storeRouters },
  { path: "/brokers", route: brokerRouters },
  { path: "/products", route: productRouters },
  { path: "/reviews", route: reviewRouters },
  { path: "/carts", route: cartRouter },
  { path: "/orders", route: orderRouters },
  { path: "/billing-address", route: billingRouters },
  { path: "/pickup-requests", route: pickupRequestRouters },
  { path: "/settings", route: settingsRoutes },
  { path: "/supports", route: supportRouters },
  { path: "/payments", route: paymentRouters },
  { path: "/shipping-address", route: shippingRoutes },
  { path: "/subscriptions", route: subscriptionRouters },
  { path: "/chats", route: chatRouters },
  { path: "/summary", route: summaryRoutes },
  { path: "/banners", route: bannerRouters },
  { path: "/vouchers", route: voucherRouters },
  { path: "/stripe-connect", route: stripeConnectRouters },
  { path: "/settlements", route: settlementRouters },
  { path: "/first-responder-discounts", route: firstResponderDiscountRouters },
];

apiRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
