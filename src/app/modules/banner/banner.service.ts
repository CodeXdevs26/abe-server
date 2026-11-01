import BannerModel from "./banner.model";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3";
import { TFile } from "../../interface/file.interface";

const createBanner = async (file: TFile) => {
  const image = await uploadToS3(file);
  const lastBanner = await BannerModel.findOne().sort({ index: -1 });
  const index = lastBanner ? lastBanner.index + 1 : 1;
  const result = await BannerModel.create({ image, index });
  return result;
};

const getAllBanners = async () => {
  const result = await BannerModel.find().sort({ index: 1 });
  return result;
};

const deleteBanner = async (id: string) => {
  const banner = await BannerModel.findById(id);
  if (!banner) {
    throw new Error("Banner not found");
  }
  const result = await BannerModel.findByIdAndDelete(id);

  if (result) {
    await deleteFromS3(banner.image);
  }
  return result;
};

const bannerServices = {
  createBanner,
  getAllBanners,
  deleteBanner,
};

export default bannerServices;
