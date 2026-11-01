import { Router } from "express";
import settingsController from "./settings.controller";
import authVerify from "../../middlewares/authVerify";
import { updateSettingsSchema } from "./settings.validation";
import validate from "../../middlewares/validate";

export const settingsRoutes = Router();

settingsRoutes.get("/", settingsController.getSettingsData);
settingsRoutes.put(
  "/",
  authVerify(["admin"]),
  validate(updateSettingsSchema),
  settingsController.updateSettingsData,
);
