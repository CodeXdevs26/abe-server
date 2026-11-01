import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import bannerServices from "./banner.service";

const createBanner = handleAsyncRequest(async (req: any, res) => {
  const file = req.file;
  const result = await bannerServices.createBanner(file);
  successResponse(res, {
    message: "Banner created successfully!",
    data: result,
    status: 201,
  });
});

const getAllBanners = handleAsyncRequest(async (req, res) => {
  const result = await bannerServices.getAllBanners();
  successResponse(res, {
    message: "Banners retrieved successfully!",
    data: result,
  });
});

const deleteBanner = handleAsyncRequest(async (req, res) => {
  const { id } = req.params;
  const result = await bannerServices.deleteBanner(id);
  successResponse(res, {
    message: "Banner deleted successfully!",
    data: result,
  });
});

const bannerControllers = {
  createBanner,
  getAllBanners,
  deleteBanner,
};

export default bannerControllers;
