import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import userControllers from "./user.controller";
import { updateUserValidationSchema } from "./user.validation";
import { uploadWithMulter } from "../../utils/awss3";
import validate from "../../middlewares/validate";

const userRouters = Router();

userRouters.get("/", authVerify(["admin"]), userControllers.getAllUsers);

userRouters.get(
  "/get-single/:id",
  authVerify(["admin", "user"]),
  userControllers.getSingleUser,
);

userRouters.get("/profile", authVerify(["user"]), userControllers.getMe);

userRouters.put(
  "/",
  authVerify(["user"]),
  uploadWithMulter.fields([
    { name: "image", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  validate(updateUserValidationSchema, { formData: true }),
  userControllers.updateUser,
);

userRouters.patch(
  "/approve/:id",
  authVerify(["admin"]),
  userControllers.approveUser,
);

userRouters.patch(
  "/block/:id",
  authVerify(["admin"]),
  userControllers.blockUser,
);

userRouters.delete(
  "/:id",
  authVerify(["admin", "user"]),
  userControllers.deleteUser,
);

export default userRouters;
