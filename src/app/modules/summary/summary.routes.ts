import { Router } from "express";
import { SummaryController } from "./summary.controller";
import authVerify from "../../middlewares/authVerify";

const router = Router();

router.get(
  "/stats",
  authVerify(["admin"]),
  SummaryController.getDashboardStats,
);
router.get(
  "/users-overview",
  authVerify(["admin"]),
  SummaryController.getUsersOverview,
);
router.get(
  "/earnings-overview",
  authVerify(["admin"]),
  SummaryController.getEarningOverview,
);

export const summaryRoutes = router;
