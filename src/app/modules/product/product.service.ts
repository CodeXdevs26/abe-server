import mongoose from "mongoose";
import { AppError } from "../../classes/appError";
import QueryBuilder from "../../classes/queryBuilder";
import CategoryModel from "../category/category.model";
import VendorModel from "../vendor/vendor.model";
import { TProduct } from "./product.interface";
import { ProductModel } from "./product.model";
import { StoreModel } from "../store/store.model";
import { TFile } from "../../interface/file.interface";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3";

const createProduct = async (
  payload: TProduct,
  currentUserEmail: string,
  files: TFile[],
) => {
  const vendor = await VendorModel.findOne({ email: currentUserEmail });
  const store = await StoreModel.findById(vendor?.store);

  if (!vendor || !store) {
    throw new AppError(404, "Invalid vendor id!");
  }

  const category = await CategoryModel.findById(payload.category);
  if (!category) {
    throw new AppError(404, "Category not found");
  }

  payload.store = vendor.store!;
  const images = [];
  for (const file of files) {
    const image = await uploadToS3(file);
    images.push(image);
  }
  payload.images = images;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const isCategoryExists = store?.categories?.includes(
      payload.category?.toString(),
    );

    if (!isCategoryExists) {
      await StoreModel.findByIdAndUpdate(
        store._id,
        { $push: { categories: payload.category } },
        { session },
      );
    }

    const result = await ProductModel.create([payload], { session });
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(400, error.message || "Error creating product!");
  } finally {
    session.endSession();
  }
};

const getAllProducts = async (query: Record<string, any>) => {
  const searchableFields = ["name", "description"];
  const productQuery = new QueryBuilder(
    ProductModel.find({
      is_deleted: false,
    }),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .selectFields();

  const meta = await productQuery.countTotal();
  const result = await productQuery.queryModel;
  return { data: result, meta };
};

const getSingleProduct = async (id: string) => {
  const result = await ProductModel.findOne({
    _id: id,
    is_deleted: false,
  }).populate("category");
  return result;
};

const updateProduct = async (
  id: string,
  payload: Partial<TProduct> & {
    oldImgsToKeep: string[];
    imagesToDelete: string[];
  },
  files?: TFile[],
) => {
  const product = await ProductModel.findOne({ _id: id, is_deleted: false });
  if (!product) {
    throw new AppError(404, "Product not found");
  }

  const { oldImgsToKeep, imagesToDelete, ...restData } = payload;
  if (imagesToDelete && imagesToDelete.length > 0) {
    for (const imgKey of imagesToDelete) {
      await deleteFromS3(imgKey);
    }
  }

  const newImages = [];
  if (files && files.length > 0) {
    for (const file of files) {
      const image = await uploadToS3(file);
      newImages.push(image);
    }
  }

  const images = [...oldImgsToKeep, ...newImages];
  const updateDoc = { ...restData, images };

  const result = await ProductModel.findByIdAndUpdate(product._id, updateDoc, {
    new: true,
  });
  return result;
};

const deleteProduct = async (id: string) => {
  const product = await ProductModel.findById(id);
  if (!product) throw new AppError(404, "Product not found");
  if (product.is_deleted) throw new AppError(400, "Product already deleted");

  const result = await ProductModel.findByIdAndUpdate(
    id,
    { is_deleted: true },
    { new: true },
  );

  if (result && product.images) {
    for (const imgKey of product.images) {
      await deleteFromS3(imgKey);
    }
  }
  return result;
};

export const productService = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
};
