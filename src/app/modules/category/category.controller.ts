import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import categoryServices from "./category.service";

const createCategory = handleAsyncRequest(async (req: any, res) => {
  const result = await categoryServices.createCategory(
    req.body,
    req.file as any,
  );
  successResponse(res, {
    message: "Category created successfully!",
    data: result,
    status: 201,
  });
});

const getAllCategories = handleAsyncRequest(async (req, res) => {
  const result = await categoryServices.getAllCategories();
  successResponse(res, {
    message: "Categories retrieved successfully!",
    data: result,
  });
});

const getSingleCategory = handleAsyncRequest(async (req, res) => {
  const id = req.params.id;
  const result = await categoryServices.getSingleCategory(id);
  successResponse(res, {
    message: "Categories retrieved successfully!",
    data: result,
  });
});

const updateCategory = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const result = await categoryServices.updateCategory(
    id,
    req.body,
    req.file as any,
  );
  successResponse(res, {
    message: "Category updated successfully!",
    data: result,
  });
});

const deleteCategory = handleAsyncRequest(async (req, res) => {
  const id = req.params.id;

  const result = await categoryServices.deleteCategory(id);
  successResponse(res, {
    message: "Category deleted successfully!",
    data: result,
  });
});

const categoryControllers = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};

export default categoryControllers;
