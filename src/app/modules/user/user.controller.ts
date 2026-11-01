import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import userServices from "./user.service";

const signUp = handleAsyncRequest(async (req, res) => {
  const result = await userServices.signUp(req.body, req.files as any);
  successResponse(res, {
    message: "User created successfully!",
    data: result,
    status: 201,
  });
});

const getAllUsers = handleAsyncRequest(async (req, res) => {
  const query = req.query;
  const result = await userServices.getAllUsers(query);
  successResponse(res, {
    message: "Users retrieved successfully!",
    data: result,
  });
});

const getSingleUser = handleAsyncRequest(async (req, res) => {
  const id = req.params.id;
  const result = await userServices.getSingleUser(id);
  successResponse(res, {
    message: "User retrieved successfully!",
    data: result,
  });
});

const updateUser = handleAsyncRequest(async (req: any, res) => {
  const result = await userServices.updateUser(
    req.body,
    req?.user?.email,
    req.files as any,
  );
  successResponse(res, {
    message: "Profile updated successfully!",
    data: result,
  });
});

const blockUser = handleAsyncRequest(async (req, res) => {
  const id = req.params.id;
  const result = await userServices.blockUser(id);
  successResponse(res, {
    message: "User blocked successfully!",
    data: result,
  });
});

const approveUser = handleAsyncRequest(async (req, res) => {
  const id = req.params.id;
  const result = await userServices.approveUser(id);
  successResponse(res, {
    message: "User approved successfully!",
    data: result,
  });
});

const deleteUser = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const email = req?.user?.email;
  const result = await userServices.deleteUser(id, email);
  successResponse(res, {
    message: "User deleted successfully!",
    data: result,
  });
});

const getMe = handleAsyncRequest(async (req: any, res) => {
  const email = req?.user?.email;
  const result = await userServices.getMe(email);
  successResponse(res, {
    message: "User profile retrieved successfully!",
    data: result,
  });
});

const userControllers = {
  signUp,
  getAllUsers,
  getSingleUser,
  updateUser,
  approveUser,
  deleteUser,
  blockUser,
  getMe,
};

export default userControllers;
