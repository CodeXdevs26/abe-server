import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import categoryControllers from "./category.controller";
import {
  categoryCreateValidationSchema,
  updateCategoryValidationSchema,
} from "./category.validation";
import { uploadWithMulter } from "../../utils/awss3";
import validate from "../../middlewares/validate";
const categoryRouters = Router();

categoryRouters.post(
  "/",
  authVerify(["admin"]),
  uploadWithMulter.single("image"),
  validate(categoryCreateValidationSchema, { formData: true }),
  categoryControllers.createCategory,
);

categoryRouters.get("/", categoryControllers.getAllCategories);

categoryRouters.get(
  "/:id",
  authVerify(["admin"]),
  categoryControllers.getSingleCategory,
);

categoryRouters.put(
  "/:id",
  authVerify(["admin"]),
  uploadWithMulter.single("image"),
  validate(updateCategoryValidationSchema, { formData: true }),
  categoryControllers.updateCategory,
);

categoryRouters.delete(
  "/:id",
  authVerify(["admin"]),
  categoryControllers.deleteCategory,
);

export default categoryRouters;
