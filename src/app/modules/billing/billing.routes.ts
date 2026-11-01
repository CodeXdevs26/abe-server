import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import { billingController } from "./billing.controller";

const billingRouters = Router();

billingRouters.get("/", authVerify(["user"]), billingController.getMyBillingAddress);
billingRouters.put("/", authVerify(["user"]), billingController.updateMyBillingAddress);

export default billingRouters;