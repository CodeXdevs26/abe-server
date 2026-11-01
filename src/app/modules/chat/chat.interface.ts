import { Types } from "mongoose";

export type TChatRole = "user" | "vendor" | "rider";

export type TChatParticipant = {
  auth: Types.ObjectId;
  profile: Types.ObjectId;
  role: TChatRole;
  email: string;
  name?: string | null;
  image?: string | null;
};

export type TConversation = {
  customer?: Types.ObjectId;
  vendor?: Types.ObjectId;
  participant_one?: TChatParticipant;
  participant_two?: TChatParticipant;
  conversation_key?: string;
  last_message?: string | null;
  last_message_at?: Date | null;
  last_message_sender_role?: TChatRole | null;
  customer_unread_count: number;
  vendor_unread_count: number;
  participant_one_unread_count?: number;
  participant_two_unread_count?: number;
  is_deleted: boolean;
};

export type TChatMessage = {
  conversation: Types.ObjectId;
  sender_email: string;
  sender_role: TChatRole;
  receiver_email: string;
  text: string;
  is_read: boolean;
  read_at?: Date | null;
  is_deleted: boolean;
};
