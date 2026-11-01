import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import settlementController from "./settlement.controller";

const settlementRouters = Router();

settlementRouters.get(
  "/vendor/history",
  authVerify(["vendor"]),
  settlementController.getVendorSettlementHistory,
);

settlementRouters.get(
  "/vendor/earnings",
  authVerify(["vendor"]),
  settlementController.getVendorEarnings,
);

settlementRouters.get(
  "/rider/history",
  authVerify(["rider"]),
  settlementController.getRiderSettlementHistory,
);

settlementRouters.get(
  "/rider/earnings",
  authVerify(["rider"]),
  settlementController.getRiderEarnings,
);

settlementRouters.get(
  "/broker/earnings",
  authVerify(["broker"]),
  settlementController.getBrokerEarnings,
);

settlementRouters.get(
  "/admin/overview",
  authVerify(["admin"]),
  settlementController.getAdminSettlementOverview,
);

settlementRouters.get(
  "/order/:orderId",
  authVerify(["admin", "vendor", "rider"]),
  settlementController.getSettlementByOrder,
);

export default settlementRouters;
