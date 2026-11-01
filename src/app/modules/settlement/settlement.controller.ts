import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import settlementServices from "./settlement.service";

const getVendorSettlementHistory = handleAsyncRequest(async (req: any, res) => {
  const result = await settlementServices.getVendorSettlementHistory(
    req.user.email,
    req.query,
  );

  successResponse(res, {
    message: "Vendor settlement history retrieved successfully!",
    data: result,
  });
});

const getVendorEarnings = handleAsyncRequest(async (req: any, res) => {
  const result = await settlementServices.getVendorEarnings(
    req.user.email,
    req.query,
  );

  successResponse(res, {
    message: "Vendor earnings retrieved successfully!",
    data: result,
  });
});

const getRiderSettlementHistory = handleAsyncRequest(async (req: any, res) => {
  const result = await settlementServices.getRiderSettlementHistory(
    req.user.email,
    req.query,
  );

  successResponse(res, {
    message: "Rider settlement history retrieved successfully!",
    data: result,
  });
});

const getRiderEarnings = handleAsyncRequest(async (req: any, res) => {
  const result = await settlementServices.getRiderEarnings(
    req.user.email,
    req.query,
  );

  successResponse(res, {
    message: "Rider earnings retrieved successfully!",
    data: result,
  });
});

const getBrokerEarnings = handleAsyncRequest(async (req: any, res) => {
  const result = await settlementServices.getBrokerEarnings(
    req.user.email,
    req.query,
  );

  successResponse(res, {
    message: "Broker earnings retrieved successfully!",
    data: result,
  });
});

const getAdminSettlementOverview = handleAsyncRequest(async (req, res) => {
  const result = await settlementServices.getAdminSettlementOverview(req.query);

  successResponse(res, {
    message: "Settlement overview retrieved successfully!",
    data: result,
  });
});

const getSettlementByOrder = handleAsyncRequest(async (req: any, res) => {
  const result = await settlementServices.getSettlementByOrder(
    req.params.orderId,
    req.user,
  );

  successResponse(res, {
    message: "Order settlement retrieved successfully!",
    data: result,
  });
});

const settlementController = {
  getVendorSettlementHistory,
  getVendorEarnings,
  getRiderSettlementHistory,
  getRiderEarnings,
  getBrokerEarnings,
  getAdminSettlementOverview,
  getSettlementByOrder,
};

export default settlementController;
