import mongoose, { Schema } from "mongoose";
import { TChatMessage, TConversation } from "./chat.interface";

const conversationSchema = new Schema<TConversation>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: false,
    },
    participant_one: {
      auth: { type: Schema.Types.ObjectId, ref: "Auth", required: false },
      profile: { type: Schema.Types.ObjectId, required: false },
      role: { type: String, enum: ["user", "vendor", "rider"], required: false },
      email: { type: String, trim: true, lowercase: true, required: false },
      name: { type: String, default: null },
      image: { type: String, default: null },
    },
    participant_two: {
      auth: { type: Schema.Types.ObjectId, ref: "Auth", required: false },
      profile: { type: Schema.Types.ObjectId, required: false },
      role: { type: String, enum: ["user", "vendor", "rider"], required: false },
      email: { type: String, trim: true, lowercase: true, required: false },
      name: { type: String, default: null },
      image: { type: String, default: null },
    },
    conversation_key: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
    },
    last_message: {
      type: String,
      trim: true,
      default: null,
    },
    last_message_at: {
      type: Date,
      default: null,
    },
    last_message_sender_role: {
      type: String,
      enum: ["user", "vendor", "rider"],
      default: null,
    },
    customer_unread_count: {
      type: Number,
      default: 0,
    },
    vendor_unread_count: {
      type: Number,
      default: 0,
    },
    participant_one_unread_count: {
      type: Number,
      default: 0,
    },
    participant_two_unread_count: {
      type: Number,
      default: 0,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index(
  { customer: 1, vendor: 1 },
  {
    unique: true,
    partialFilterExpression: {
      customer: { $type: "objectId" },
      vendor: { $type: "objectId" },
    },
  },
);
conversationSchema.index({ last_message_at: -1 });

const messageSchema = new Schema<TChatMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    sender_role: {
      type: String,
      enum: ["user", "vendor", "rider"],
      required: true,
    },
    receiver_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    is_read: {
      type: Boolean,
      default: false,
    },
    read_at: {
      type: Date,
      default: null,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export const ConversationModel = mongoose.model<TConversation>(
  "Conversation",
  conversationSchema,
);

export const ChatMessageModel = mongoose.model<TChatMessage>(
  "ChatMessage",
  messageSchema,
);
