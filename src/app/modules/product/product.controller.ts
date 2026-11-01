import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import { productService } from "./product.service";

const createProduct = handleAsyncRequest(async (req: any, res) => {
  const currentUserEmail = req.user.email;
  const result = await productService.createProduct(
    req.body,
    currentUserEmail,
    req.files as any,
  );
  successResponse(res, {
    message: "Product created successfully!",
    data: result,
    status: 201,
  });
});

const getAllProducts = handleAsyncRequest(async (req: any, res) => {
  const query = req.query;
  const result = await productService.getAllProducts(query);
  successResponse(res, {
    message: "Products retrieved successfully!",
    data: result,
  });
});

const getSingleProduct = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const result = await productService.getSingleProduct(id);
  successResponse(res, {
    message: "Product retrieved successfully!",
    data: result,
  });
});

const updateProduct = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;

  const result = await productService.updateProduct(
    id,
    req.body,
    req.files as any,
  );
  successResponse(res, {
    message: "Product updated successfully!",
    data: result,
  });
});

const deleteProduct = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const result = await productService.deleteProduct(id);
  successResponse(res, {
    message: "Product deleted successfully!",
    data: result,
  });
});

export const productController = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
};
