import { Router } from "express";
import adminControllers from "./admin.controller";
import authVerify from "../../middlewares/authVerify";
import updateAdminValidationSchema from "./admin.validation";
import { uploadWithMulter } from "../../utils/awss3";
import validate from "../../middlewares/validate";
const adminRouters = Router();

adminRouters.get(
  "/profile",
  authVerify(["admin"]),
  adminControllers.getAdminById,
);
adminRouters.put(
  "/:id",
  authVerify(["admin"]),
  uploadWithMulter.single("image"),
  validate(updateAdminValidationSchema, { formData: true }),
  adminControllers.updateAdmin,
);
export default adminRouters;
