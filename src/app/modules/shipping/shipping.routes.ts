import { Router } from "express";
import { shippingController } from "./shipping.controller";
import authVerify from "../../middlewares/authVerify";

const router = Router();

router.get("/", authVerify(["user"]), shippingController.getMyShippingAddress);

export const shippingRoutes = router;
