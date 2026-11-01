import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import settingsServices from "./settings.service";

const getSettingsData = handleAsyncRequest(async (req, res) => {
  const result = await settingsServices.getSettingsData();
  successResponse(res, {
    message: "Settings data retrieved successfully!",
    data: result,
  });
});

const updateSettingsData = handleAsyncRequest(async (req, res) => {
  const payload = req.body;
  const result = await settingsServices.updateSettingsData(payload);
  successResponse(res, {
    message: "Settings data updated successfully!",
    data: result,
  });
});

const settingsController = {
  getSettingsData,
  updateSettingsData,
};

export default settingsController;
