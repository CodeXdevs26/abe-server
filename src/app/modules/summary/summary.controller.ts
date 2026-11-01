import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import { SummaryService } from "./summary.service";

const getDashboardStats = handleAsyncRequest(async (req, res) => {
  const result = await SummaryService.getDashboardStats();
  successResponse(res, {
    message: "Dashboard stats retrieved successfully!",
    data: result,
  });
});

const getUsersOverview = handleAsyncRequest(async (req, res) => {
  const { year } = req.query;
  const result = await SummaryService.getUsersOverview(Number(year));
  successResponse(res, {
    message: "Users overview retrieved successfully!",
    data: result,
  });
});

const getEarningOverview = handleAsyncRequest(async (req, res) => {
  const { year } = req.query;
  const result = await SummaryService.getEarningOverview(Number(year));
  successResponse(res, {
    message: "Earnings overview retrieved successfully!",
    data: result,
  });
});

export const SummaryController = {
  getDashboardStats,
  getUsersOverview,
  getEarningOverview,
};
