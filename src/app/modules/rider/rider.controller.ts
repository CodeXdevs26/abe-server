import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import riderServices from "./rider.service";

const signUp = handleAsyncRequest(async (req, res) => {
  const result = await riderServices.signUp(req.body, req.files as any);
  successResponse(res, {
    message: "Rider account created successfully!",
    data: result,
    status: 201,
  });
});

const getMe = handleAsyncRequest(async (req: any, res) => {
  const email = req?.user?.email;
  const result = await riderServices.getMe(email);
  successResponse(res, {
    message: "Rider profile retrieved successfully!",
    data: result,
  });
});

const getAllRiders = handleAsyncRequest(async (req, res) => {
  const query = req.query;
  const result = await riderServices.getAllRiders(query);
  successResponse(res, {
    message: "Riders retrieved successfully!",
    data: result,
  });
});

const getSingleRider = handleAsyncRequest(async (req, res) => {
  const id = req.params.id;
  const result = await riderServices.getSingleRider(id);
  successResponse(res, {
    message: "Rider retrieved successfully!",
    data: result,
  });
});

const updateRider = handleAsyncRequest(async (req: any, res) => {
  const email = req?.user?.email;

  const id = req.params.id;
  const result = await riderServices.updateRider(
    id,
    req.body,
    email,
    req.files as any,
  );
  successResponse(res, {
    message: "Rider updated successfully!",
    data: result,
  });
});

const approveRider = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const result = await riderServices.approveRider(id);
  successResponse(res, {
    message: "Rider approved successfully!",
    data: result,
  });
});

const blockRider = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const result = await riderServices.blockRider(id);
  successResponse(res, {
    message: "Rider blocked successfully!",
    data: result,
  });
});

const deleteRider = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const email = req?.user?.email;
  const result = await riderServices.deleteRider(id, email);
  successResponse(res, {
    message: "Rider deleted successfully!",
    data: result,
  });
});

const riderControllers = {
  signUp,
  getAllRiders,
  getSingleRider,
  updateRider,
  approveRider,
  blockRider,
  deleteRider,
  getMe,
};

export default riderControllers;
