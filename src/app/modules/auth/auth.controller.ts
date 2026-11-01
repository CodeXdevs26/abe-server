import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import AuthServices from "./auth.service";

const loginUser = handleAsyncRequest(async (req, res) => {
  const payload = req.body;
  const result = await AuthServices.loginUser(payload);
  successResponse(res, {
    message: "User logged in successfully!",
    data: result,
  });
});

const sendOtp = handleAsyncRequest(async (req, res) => {
  const payload = req.body;
  await AuthServices.sendOtp(payload);
  successResponse(res, {
    data: { email: payload.email },
    message: "OTP sent successfully!",
  });
});

const verifyOtp = handleAsyncRequest(async (req, res) => {
  const payload = req.body;
  const result = await AuthServices.verifyOtp(payload);
  successResponse(res, {
    message: "OTP verified successfully!",
    data: result ? { email: payload.email, ...result } : { email: payload.email },
  });
});

const resetForgottenPassword = handleAsyncRequest(async (req, res) => {
  const payload = req.body;
  await AuthServices.resetForgottenPassword(payload);
  successResponse(res, {
    message: "Password reset successfully!",
  });
});

const createNewPassword = handleAsyncRequest(async (req, res) => {
  const payload = req.body;
  const result = await AuthServices.createNewPassword(payload);
  successResponse(res, {
    message: "New password created successfully!",
    data: result,
  });
});

const getNewAccessToken = handleAsyncRequest(async (req, res) => {
  const token = req.params.token;
  const result = await AuthServices.getNewAccessToken(token);
  successResponse(res, {
    message: "New access token retrieved successfully!",
    data: result,
  });
});

const changeUserStatus = handleAsyncRequest(async (req, res) => {
  const email = req.params.email;
  const result = await AuthServices.changeUserStatus(email);
  successResponse(res, {
    message: "User status changed successfully!",
    data: result,
  });
});

const getAllUsers = handleAsyncRequest(async (req, res) => {
  const query = req.query;
  const result = await AuthServices.getAllUsers(query);
  successResponse(res, {
    message: "Users retrieved successfully!",
    data: result,
  });
});

const giveFreeTrial = handleAsyncRequest(async (req, res) => {
  const email = req.params.email;
  const result = await AuthServices.giveFreeTrial(email);
  successResponse(res, {
    message: "Free trial given successfully!",
    data: result,
  });
});

const getSingleUserByAuthId = handleAsyncRequest(async (req, res) => {
  const id = req.params.id;
  const result = await AuthServices.getSingleUserByAuthId(id);
  successResponse(res, {
    message: "User retrieved successfully!",
    data: result,
  });
});

const updateApprovalStatus = handleAsyncRequest(async (req, res) => {
  const id = req.params.id;
  const status = req.body.status;
  const result = await AuthServices.updateApprovalStatus(id, status);
  successResponse(res, {
    message: `Account ${status} successfully!`,
    data: result,
  });
});

const AuthController = {
  loginUser,
  sendOtp,
  verifyOtp,
  resetForgottenPassword,
  createNewPassword,
  getNewAccessToken,
  changeUserStatus,
  getAllUsers,
  getSingleUserByAuthId,
  giveFreeTrial,
  updateApprovalStatus,
};

export default AuthController;
