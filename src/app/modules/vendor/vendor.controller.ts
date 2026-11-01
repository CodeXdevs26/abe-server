import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import vendorServices from "./vendor.service";

const signUp = handleAsyncRequest(async (req, res) => {
  const result = await vendorServices.signUp(req.body, req.files as any);
  successResponse(res, {
    message: "Vendor account created successfully!",
    data: result,
    status: 201,
  });
});

const getMe = handleAsyncRequest(async (req: any, res) => {
  const email = req?.user?.email;
  const result = await vendorServices.getMe(email);
  successResponse(res, {
    message: "Vendor profile retrieved successfully!",
    data: result,
  });
});

const getAllVendors = handleAsyncRequest(async (req, res) => {
  const query = req.query;
  const result = await vendorServices.getAllVendors(query);
  successResponse(res, {
    message: "Vendors retrieved successfully!",
    data: result,
  });
});

const getSingleVendor = handleAsyncRequest(async (req, res) => {
  const vendorId = req.params.id;
  const result = await vendorServices.getSingleVendor(vendorId);
  successResponse(res, {
    message: "Vendor retrieved successfully!",
    data: result,
  });
});

const updateVendor = handleAsyncRequest(async (req: any, res) => {
  const email = req?.user?.email;
  const id = req.params.id;
  const result = await vendorServices.updateVendor(
    id,
    req.body,
    email,
    req.files as any,
  );
  successResponse(res, {
    message: "Vendor updated successfully!",
    data: result,
  });
});

const approveVendor = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const result = await vendorServices.approveVendor(id);
  successResponse(res, {
    message: "Vendor approved successfully!",
    data: result,
  });
});

const blockVendor = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const result = await vendorServices.blockVendor(id);
  successResponse(res, {
    message: "Vendor blocked successfully!",
    data: result,
  });
});

const deleteVendor = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const email = req?.user?.email;
  const result = await vendorServices.deleteVendor(id, email);
  successResponse(res, {
    message: "Vendor deleted successfully!",
    data: result,
  });
});

const vendorControllers = {
  signUp,
  getAllVendors,
  getSingleVendor,
  updateVendor,
  approveVendor,
  blockVendor,
  deleteVendor,
  getMe,
};

export default vendorControllers;
