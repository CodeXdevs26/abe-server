import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import { adminServices } from "./admin.service";

const updateAdmin = handleAsyncRequest(async (req, res) => {
  const id = req.params.id;
  const result = await adminServices.updateAdmin(id, req.body, req.file);
  successResponse(res, {
    message: "Admin data updated successfully!",
    data: result,
  });
});

const getAdminById = handleAsyncRequest(async (req: any, res) => {
  const result = await adminServices.getAdminById(req?.user?.email);
  successResponse(res, {
    message: "Admin data retrieved successfully!",
    data: result,
  });
});

const adminControllers = {
  updateAdmin,
  getAdminById,
};

export default adminControllers;
