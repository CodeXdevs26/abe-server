import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import vendorControllers from "./vendor.controller";
import { vendorUpdateValidationSchema } from "./vendor.validation";
import validate from "../../middlewares/validate";
import { uploadWithMulter } from "../../utils/awss3";

const vendorRouters = Router();

vendorRouters.get("/", authVerify(["admin"]), vendorControllers.getAllVendors);

vendorRouters.get("/profile", authVerify(["vendor"]), vendorControllers.getMe);

vendorRouters.get(
  "/get-single/:id",
  authVerify(["admin", "vendor"]),
  vendorControllers.getSingleVendor,
);

vendorRouters.put(
  "/:id",
  authVerify(["vendor"]),
  uploadWithMulter.fields([
    { name: "images", maxCount: 4 },
    { name: "document", maxCount: 1 },
  ]),
  validate(vendorUpdateValidationSchema, { formData: true }),
  vendorControllers.updateVendor,
);

vendorRouters.patch(
  "/approve/:id",
  authVerify(["admin"]),
  vendorControllers.approveVendor,
);

vendorRouters.patch(
  "/block/:id",
  authVerify(["admin"]),
  vendorControllers.blockVendor,
);

vendorRouters.delete(
  "/:id",
  authVerify(["admin", "vendor"]),
  vendorControllers.deleteVendor,
);

export default vendorRouters;
