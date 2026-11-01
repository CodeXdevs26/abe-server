import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import { orderController } from "./order.controller";
import { orderDataSchema } from "../payment/payment.validation";
import validate from "../../middlewares/validate";
import requireActiveSubscription from "../../middlewares/requireActiveSubscription";

const orderRouters = Router();

orderRouters.post(
  "/",
  authVerify(["user"]),
  validate(orderDataSchema),
  orderController.createOrder,
);
orderRouters.get("/user", authVerify(["user"]), orderController.getUsersOrders);
orderRouters.get(
  "/vendor",
  authVerify(["vendor"]),
  requireActiveSubscription(["vendor"]),
  orderController.getVendorsOrders,
);
orderRouters.get(
  "/:id",
  authVerify(["user", "admin", "vendor", "rider"]),
  orderController.getSingleOrder,
);
orderRouters.patch(
  "/:id",
  authVerify(["admin"]),
  orderController.updateOrderStatus,
);
export default orderRouters;
