import { Router } from "express";
import {
  approvalStatusValidationSchema,
  createNewPasswordValidationSchema,
  emailValidationSchema,
  loginUserValidationSchema,
  resetForgottenPasswordSchema,
  verifyOtpSchema,
} from "./auth.validation";
import AuthController from "./auth.controller";
import userControllers from "../user/user.controller";
import { userSignUpValidationSchema } from "../user/user.validation";
import { riderSignupValidationSchema } from "../rider/rider.validation";
import riderControllers from "../rider/rider.controller";
import { vendorSignupValidationSchema } from "../vendor/vendor.validation";
import vendorControllers from "../vendor/vendor.controller";
import brokerControllers from "../broker/broker.controller";
import { brokerSignupValidationSchema } from "../broker/broker.validation";
import validate from "../../middlewares/validate";
import { uploadWithMulter } from "../../utils/awss3";
import authVerify from "../../middlewares/authVerify";

const authRouters = Router();
authRouters.post(
  "/user-sign-up",
  uploadWithMulter.fields([
    { name: "image", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  validate(userSignUpValidationSchema, { formData: true }),
  userControllers.signUp,
);
authRouters.post(
  "/rider-sign-up",
  uploadWithMulter.fields([
    { name: "image", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  validate(riderSignupValidationSchema, { formData: true }),
  riderControllers.signUp,
);
authRouters.post(
  "/vendor-sign-up",
  uploadWithMulter.fields([
    { name: "images", maxCount: 4 },
    { name: "document", maxCount: 1 },
  ]),
  validate(vendorSignupValidationSchema, { formData: true }),
  vendorControllers.signUp,
);
authRouters.post(
  "/broker-sign-up",
  uploadWithMulter.single("image"),
  validate(brokerSignupValidationSchema, { formData: true }),
  brokerControllers.signUp,
);
authRouters.post(
  "/login",
  validate(loginUserValidationSchema),
  AuthController.loginUser,
);
authRouters.post(
  "/send-otp",
  validate(emailValidationSchema),
  AuthController.sendOtp,
);
authRouters.post(
  "/verify-otp",
  validate(verifyOtpSchema),
  AuthController.verifyOtp,
);
authRouters.post(
  "/reset-forgotten-password",
  validate(resetForgottenPasswordSchema),
  AuthController.resetForgottenPassword,
);
authRouters.post(
  "/change-password",
  validate(createNewPasswordValidationSchema),
  AuthController.createNewPassword,
);
authRouters.get("/get-access-token/:token", AuthController.getNewAccessToken);
authRouters.patch(
  "/change-user-status/:email",
  AuthController.changeUserStatus,
);
authRouters.get(
  "/get-all-users",
  authVerify(["admin"]),
  AuthController.getAllUsers,
);
authRouters.get(
  "/get-single-user/:id",
  authVerify(["admin"]),
  AuthController.getSingleUserByAuthId,
);

authRouters.post(
  "/give-free-trial/:email",
  authVerify(["admin"]),
  AuthController.giveFreeTrial,
);

authRouters.patch(
  "/approval-status/:id",
  authVerify(["admin"]),
  validate(approvalStatusValidationSchema),
  AuthController.updateApprovalStatus,
);

export default authRouters;
