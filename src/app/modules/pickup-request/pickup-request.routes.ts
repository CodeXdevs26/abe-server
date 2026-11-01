import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import {
  pickupRequestValidationSchema,
  updateStatusValidationSchema,
} from "./pickup-request.validation";
import pickupRequestController from "./pickup-request.controller";
import validate from "../../middlewares/validate";
import requireActiveSubscription from "../../middlewares/requireActiveSubscription";
import { uploadWithMulter } from "../../utils/awss3";

const pickupRequestRouters = Router();

pickupRequestRouters.post(
  "/",
  authVerify(["user"]),
  validate(pickupRequestValidationSchema),
  pickupRequestController.createPickupRequest,
);

pickupRequestRouters.get(
  "/",
  authVerify(["rider"]),
  requireActiveSubscription(["rider"]),
  pickupRequestController.getAllPickupRequests,
);
pickupRequestRouters.get(
  "/:id",
  authVerify(["rider"]),
  requireActiveSubscription(["rider"]),
  pickupRequestController.getSinglePickupRequest,
);
pickupRequestRouters.patch(
  "/reject/:id",
  authVerify(["rider"]),
  requireActiveSubscription(["rider"]),
  pickupRequestController.rejectRequest,
);
pickupRequestRouters.patch(
  "/accept/:id",
  authVerify(["rider"]),
  requireActiveSubscription(["rider"]),
  pickupRequestController.acceptRequest,
);
pickupRequestRouters.patch(
  "/:id",
  authVerify(["rider", "vendor"]),
  requireActiveSubscription(["rider", "vendor"]),
  uploadWithMulter.single("delivery_proof_image"),
  validate(updateStatusValidationSchema, { formData: true }),
  pickupRequestController.updateRequestStatus,
);

export default pickupRequestRouters;
