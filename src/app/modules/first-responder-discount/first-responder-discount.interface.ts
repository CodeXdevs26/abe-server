import { TFirstResponderType } from "../../constants/firstResponder.constant";

export type TFirstResponderDiscounts = Record<TFirstResponderType, number>;

export type TFirstResponderDiscountSettings = TFirstResponderDiscounts & {
  key: string;
  createdAt?: Date;
  updatedAt?: Date;
};
