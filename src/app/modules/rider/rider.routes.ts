import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import riderControllers from "./rider.controller";
import { updateRiderValidationSchema } from "./rider.validation";
import validate from "../../middlewares/validate";
import { uploadWithMulter } from "../../utils/awss3";

const riderRouters = Router();

riderRouters.get("/", authVerify(["admin"]), riderControllers.getAllRiders);

riderRouters.get("/profile", authVerify(["rider"]), riderControllers.getMe);

riderRouters.get(
  "/get-single/:id",
  authVerify(["admin", "rider"]),
  riderControllers.getSingleRider,
);

riderRouters.put(
  "/:id",
  authVerify(["admin", "rider"]),
  uploadWithMulter.fields([
    { name: "image", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  validate(updateRiderValidationSchema, { formData: true }),
  riderControllers.updateRider,
);
riderRouters.patch(
  "/approve/:id",
  authVerify(["admin"]),
  riderControllers.approveRider,
);
riderRouters.patch(
  "/block/:id",
  authVerify(["admin"]),
  riderControllers.blockRider,
);
riderRouters.delete(
  "/:id",
  authVerify(["admin", "rider"]),
  riderControllers.deleteRider,
);

export default riderRouters;
