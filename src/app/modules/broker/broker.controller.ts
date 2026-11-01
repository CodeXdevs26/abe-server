import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import brokerServices from "./broker.service";

const signUp = handleAsyncRequest(async (req, res) => {
  const result = await brokerServices.signUp(req.body, req.file as any);
  successResponse(res, {
    message: "Broker account created successfully!",
    data: result,
    status: 201,
  });
});

const getMe = handleAsyncRequest(async (req: any, res) => {
  const email = req?.user?.email;
  const result = await brokerServices.getMe(email);
  successResponse(res, {
    message: "Broker profile retrieved successfully!",
    data: result,
  });
});

const getAllBrokers = handleAsyncRequest(async (req, res) => {
  const query = req.query;
  const result = await brokerServices.getAllBrokers(query);
  successResponse(res, {
    message: "Brokers retrieved successfully!",
    data: result,
  });
});

const getSingleBroker = handleAsyncRequest(async (req, res) => {
  const id = req.params.id;
  const result = await brokerServices.getSingleBroker(id);
  successResponse(res, {
    message: "Broker retrieved successfully!",
    data: result,
  });
});

const updateBroker = handleAsyncRequest(async (req: any, res) => {
  const email = req?.user?.email;

  const id = req.params.id;
  const result = await brokerServices.updateBroker(
    id,
    req.body,
    email,
    req.file as any,
  );
  successResponse(res, {
    message: "Broker updated successfully!",
    data: result,
  });
});

const approveBroker = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const result = await brokerServices.approveBroker(id);
  successResponse(res, {
    message: "Broker approved successfully!",
    data: result,
  });
});

const blockBroker = handleAsyncRequest(async (req, res) => {
  const id = req.params.id;
  const result = await brokerServices.blockBroker(id);
  successResponse(res, {
    message: "Broker blocked successfully!",
    data: result,
  });
});

const deleteBroker = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const email = req?.user?.email;
  const result = await brokerServices.deleteBroker(id, email);
  successResponse(res, {
    message: "Broker deleted successfully!",
    data: result,
  });
});

const brokerControllers = {
  signUp,
  getAllBrokers,
  getSingleBroker,
  updateBroker,
  approveBroker,
  blockBroker,
  deleteBroker,
  getMe,
};

export default brokerControllers;
