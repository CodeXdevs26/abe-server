import { AppError } from "../../classes/appError";
import { TFile } from "../../interface/file.interface";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3";
import { TAdmin } from "./admin.interface";
import AdminModel from "./admin.model";

const getAdminById = async (email: string) => {
  const admin = await AdminModel.findOne({
    email,
  });
  if (!admin) {
    throw new AppError(404, "Admin not found");
  }
  return admin;
};

const updateAdmin = async (
  id: string,
  payload: Partial<TAdmin>,
  file?: TFile,
) => {
  const admin = await AdminModel.findById(id);
  if (!admin) {
    throw new AppError(404, "Admin not found");
  }

  if (file) {
    payload.image = await uploadToS3(file);
  }

  const result = await AdminModel.findByIdAndUpdate(admin._id, payload, {
    new: true,
  });
  if (result && payload.image) await deleteFromS3(admin.image);
  return result;
};

export const adminServices = { updateAdmin, getAdminById };
