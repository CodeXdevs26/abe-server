import { model, Schema } from "mongoose";
import { DEFAULT_FIRST_RESPONDER_DISCOUNTS } from "../../constants/firstResponder.constant";
import { TFirstResponderDiscountSettings } from "./first-responder-discount.interface";

const firstResponderDiscountSchema =
  new Schema<TFirstResponderDiscountSettings>(
    {
      key: {
        type: String,
        required: true,
        unique: true,
        default: "first_responder_discounts",
      },
      police_officer: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_FIRST_RESPONDER_DISCOUNTS.police_officer,
      },
      firefighter: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_FIRST_RESPONDER_DISCOUNTS.firefighter,
      },
      ems_paramedic: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_FIRST_RESPONDER_DISCOUNTS.ems_paramedic,
      },
      active_military: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_FIRST_RESPONDER_DISCOUNTS.active_military,
      },
      veteran: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_FIRST_RESPONDER_DISCOUNTS.veteran,
      },
      nurse: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_FIRST_RESPONDER_DISCOUNTS.nurse,
      },
      doctor: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_FIRST_RESPONDER_DISCOUNTS.doctor,
      },
    },
    { timestamps: true },
  );

const FirstResponderDiscountModel = model<TFirstResponderDiscountSettings>(
  "FirstResponderDiscount",
  firstResponderDiscountSchema,
);

export default FirstResponderDiscountModel;
