import { TSettings } from "./settings.interface";
import SettingsModel from "./settings.model";

const getSettingsData = async () => {
  const settings = await SettingsModel.find();
  return settings;
};

const updateSettingsData = async (payload: TSettings) => {
  const setting = await SettingsModel.findOne({});

  let result = null;
  if (setting) {
    result = await SettingsModel.findOneAndUpdate({}, payload, { new: true });
  } else {
    result = await SettingsModel.create(payload);
  }
  return result;
};

const settingsServices = {
  getSettingsData,
  updateSettingsData,
};

export default settingsServices;
