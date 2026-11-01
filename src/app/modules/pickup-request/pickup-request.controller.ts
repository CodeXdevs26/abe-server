import handleAsyncRequest from "../../utils/handleAsyncRequest"
import { successResponse } from "../../utils/successResponse";
import { TFile } from "../../interface/file.interface";
import { pickupRequestService } from "./pickup-request.service";

const getStatusFromRequestBody = (body: any) => {
  if (typeof body?.status === "string") return body.status;

  const fields = body?.fields;
  if (Array.isArray(fields)) {
    const statusField = fields.find((field) => field?.key === "status");
    return statusField?.value;
  }

  if (typeof fields === "string") {
    try {
      const parsedFields = JSON.parse(fields);
      const statusField = Array.isArray(parsedFields)
        ? parsedFields.find((field) => field?.key === "status")
        : null;
      return statusField?.value;
    } catch {
      return undefined;
    }
  }

  return undefined;
};

const createPickupRequest = handleAsyncRequest(async (req, res) => {
  const payload = req.body;
  const result = await pickupRequestService.createPickupRequest(payload);
  successResponse(res, {
    message: "Pickup request created successfully!",
    data: result,
    status: 201
  })
})

const getAllPickupRequests = handleAsyncRequest(async (req: any, res) => {
  const currentUserEmail = req.user.email;
  const query = req.query;
  const result = await pickupRequestService.getAllPickupRequests(currentUserEmail, query);
  successResponse(res, {
    message: "Pickup requests retrieved successfully!",
    data: result,
  })
})

const getSinglePickupRequest = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const currentUserEmail = req.user.email;
  const result = await pickupRequestService.getSinglePickupRequest(
    id,
    currentUserEmail,
  );
  successResponse(res, {
    message: "Pickup request retrieved successfully!",
    data: result,
  })
})

const rejectRequest = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const currentUserEmail = req.user.email;
  const result = await pickupRequestService.rejectRequest(id, currentUserEmail);
  successResponse(res, {
    message: "Pickup request rejected successfully!",
    data: result,
  })
})

const acceptRequest = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const currentUserEmail = req.user.email;
  const result = await pickupRequestService.acceptRequest(id, currentUserEmail);
  successResponse(res, {
    message: "Pickup request accepted successfully!",
    data: result,
  })
})

const updateRequestStatus = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const currentUserEmail = req.user.email;
  const status = getStatusFromRequestBody(req.body);
  const result = await pickupRequestService.updateRequestStatus(
    id,
    currentUserEmail,
    status,
    req.file as TFile,
  );
  successResponse(res, {
    message: "Pickup request status updated successfully!",
    data: result,
  })
})

const pickupRequestController = {
  createPickupRequest,
  getAllPickupRequests,
  getSinglePickupRequest,
  rejectRequest,
  acceptRequest,
  updateRequestStatus
}

export default pickupRequestController;
