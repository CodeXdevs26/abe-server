import { AppError } from "../../classes/appError";
import { TFile } from "../../interface/file.interface";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3";
import { ProductModel } from "../product/product.model";
import { TCategory } from "./category.interface";
import CategoryModel from "./category.model";

const createCategory = async (payload: TCategory, file: TFile) => {
  const category = await CategoryModel.findOne({ name: payload.name });
  if (category) {
    throw new AppError(400, "Category already exists");
  }
  payload.icon = await uploadToS3(file);
  const result = await CategoryModel.create(payload);
  return result;
};

const getAllCategories = async () => {
  const result = await CategoryModel.find();
  return result;
};

const getSingleCategory = async (_id: string) => {
  const result = await CategoryModel.findById(_id);
  return result;
};

const updateCategory = async (
  _id: string,
  payload: TCategory,
  file?: TFile,
) => {
  const category = await CategoryModel.findById(_id);
  if (!category) {
    if (payload.icon) throw new AppError(404, "Category not found");
  }

  console.log('file', file);
  if (file) payload.icon = await uploadToS3(file);
  const updateDoc = { ...payload };
  const result = await CategoryModel.findByIdAndUpdate(_id, updateDoc, {
    new: true,
  });

  // delete old image from s3 bucket
  if (result && payload.icon && category?.icon) {
    await deleteFromS3(category.icon);
  }

  return result;
};

const deleteCategory = async (_id: string) => {
  const category = await CategoryModel.findById(_id);
  if (!category) throw new AppError(404, "Category not found");

  const linkedProduct = await ProductModel.findOne({
    category: category._id,
    is_deleted: false,
  }).select("_id");

  if (linkedProduct) {
    throw new AppError(
      400,
      "This category is already associated with a product and cannot be deleted",
    );
  }

  const result = await CategoryModel.findOneAndDelete({ _id }, { new: true });

  if (result && category.icon) {
    await deleteFromS3(category.icon);
  }

  return result;
};

const categoryServices = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
export default categoryServices;
