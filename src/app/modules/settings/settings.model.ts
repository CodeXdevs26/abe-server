import { model, Schema } from 'mongoose'
import { TSettings } from './settings.interface'

const settingsSchema = new Schema<TSettings>(
  {
    terms_conditions: { type: String, required: true },
    about_us: { type: String, required: true },
    privacy_policy: { type: String, required: true },
    broker_monthly_subscription_fee: { type: Number, default: 0 },
    rider_monthly_subscription_fee: { type: Number, default: 0 },
    vendor_monthly_subscription_fee: { type: Number, default: 0 },
  },
  { timestamps: true },
)

const SettingsModel = model<TSettings>('Settings', settingsSchema)
export default SettingsModel
