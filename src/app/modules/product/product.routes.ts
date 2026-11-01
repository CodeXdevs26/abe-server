import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import {
  createProductValidationSchema,
  updateProductValidationSchema,
} from "./product.validation";
import { productController } from "./product.controller";
import { uploadWithMulter } from "../../utils/awss3";
import validate from "../../middlewares/validate";
import requireActiveSubscription from "../../middlewares/requireActiveSubscription";
const productRouters = Router();

productRouters.post(
  "/",
  authVerify(["vendor"]),
  requireActiveSubscription(["vendor"]),
  uploadWithMulter.array("images", 5),
  validate(createProductValidationSchema, { formData: true }),
  productController.createProduct,
);

productRouters.get("/", productController.getAllProducts);
productRouters.get("/:id", productController.getSingleProduct);
productRouters.put(
  "/:id",
  authVerify(["vendor"]),
  requireActiveSubscription(["vendor"]),
  uploadWithMulter.array("images", 5),
  validate(updateProductValidationSchema, { formData: true }),
  productController.updateProduct,
);
productRouters.delete(
  "/:id",
  authVerify(["vendor"]),
  requireActiveSubscription(["vendor"]),
  productController.deleteProduct,
);
export default productRouters;
