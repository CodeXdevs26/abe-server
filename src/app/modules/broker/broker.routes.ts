import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import brokerControllers from "./broker.controller";
import { updateBrokerValidationSchema } from "./broker.validation";
import { uploadWithMulter } from "../../utils/awss3";
import validate from "../../middlewares/validate";

const brokerRouters = Router();

brokerRouters.get("/", authVerify(["admin"]), brokerControllers.getAllBrokers);

brokerRouters.get("/profile", authVerify(["broker"]), brokerControllers.getMe);

brokerRouters.get(
  "/get-single/:id",
  authVerify(["admin", "broker"]),
  brokerControllers.getSingleBroker,
);

brokerRouters.put(
  "/:id",
  authVerify(["admin", "broker"]),
  uploadWithMulter.single("image"),
  validate(updateBrokerValidationSchema, { formData: true }),
  brokerControllers.updateBroker,
);

brokerRouters.patch(
  "/approve/:id",
  authVerify(["admin"]),
  brokerControllers.approveBroker,
);

brokerRouters.patch(
  "/block/:id",
  authVerify(["admin"]),
  brokerControllers.blockBroker,
);
brokerRouters.delete(
  "/:id",
  authVerify(["admin", "broker"]),
  brokerControllers.deleteBroker,
);

export default brokerRouters;
