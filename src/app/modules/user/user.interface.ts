import { TFile } from "../../interface/file.interface";
import {
  TFirstResponderStatus,
  TFirstResponderType,
} from "../../constants/firstResponder.constant";

export type TRewardPoint = {
  points: number;
  remainingPoints: number;
  earnedAt: Date;
  expiresAt: Date;
};

export type TUser = {
  name: string;
  image: string;
  email: string;
  location?: string | null;
  contact?: string | null;
  document?: string | null;
  first_responder_type?: TFirstResponderType | null;
  first_responder_status?: TFirstResponderStatus;
  is_approved: boolean;
  is_blocked: boolean;
  is_deleted: boolean;
  rewardPoints?: TRewardPoint[];
};

export type TUserFiles = {
  image: TFile[];
  document: TFile[];
};
