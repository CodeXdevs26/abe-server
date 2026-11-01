import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import bannerControllers from "./banner.controller";
import { uploadWithMulter } from "../../utils/awss3";

const bannerRouters = Router();

bannerRouters.post(
  "/",
  authVerify(["admin"]),
  uploadWithMulter.single("image"),
  bannerControllers.createBanner,
);

bannerRouters.get("/", bannerControllers.getAllBanners);

bannerRouters.delete("/:id", authVerify(["admin"]), bannerControllers.deleteBanner);

export default bannerRouters;