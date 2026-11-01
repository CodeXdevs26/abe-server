import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import { storeServices } from "./store.service";

const getAllStores = handleAsyncRequest(async (req, res) => {
  const query = req.query;
  const result = await storeServices.getAllStores(query);
  successResponse(res, {
    message: "Stores retrieved successfully!",
    data: result,
  });
});

const getSingleStore = handleAsyncRequest(async (req, res) => {
  const id = req.params.id;
  const result = await storeServices.getSingleStore(id);
  successResponse(res, {
    message: "Store retrieved successfully!",
    data: result,
  });
});

export const storeControllers = {
  getAllStores,
  getSingleStore
}