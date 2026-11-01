import { Router } from "express";
import supportController from "./support.controller";
import authVerify from "../../middlewares/authVerify";
import { supportValidationSchema } from "./support.validation";
import validate from "../../middlewares/validate";

const supportRouters = Router();
supportRouters.post(
  "/",
  authVerify(["user"]),
  validate(supportValidationSchema),
  supportController.sendMessage,
);

export default supportRouters;
