import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import { chatServices } from "./chat.service";

const createConversation = handleAsyncRequest(async (req: any, res) => {
  const result = await chatServices.createConversation(
    req.user.email,
    req.user.role,
    req.body.partnerId || req.body.vendorId,
  );

  successResponse(res, {
    message: "Conversation created successfully!",
    data: result,
    status: 201,
  });
});

const getConversations = handleAsyncRequest(async (req: any, res) => {
  const result = await chatServices.getConversations(
    req.user.email,
    req.user.role,
    req.query,
  );

  successResponse(res, {
    message: "Conversations retrieved successfully!",
    data: result,
  });
});

const getConversationMessages = handleAsyncRequest(async (req: any, res) => {
  const result = await chatServices.getConversationMessages(
    req.params.id,
    req.user.email,
    req.user.role,
    req.query,
  );

  successResponse(res, {
    message: "Messages retrieved successfully!",
    data: result,
  });
});

const markConversationAsRead = handleAsyncRequest(async (req: any, res) => {
  const result = await chatServices.markConversationAsRead(
    req.params.id,
    req.user.email,
    req.user.role,
  );

  successResponse(res, {
    message: "Conversation marked as read successfully!",
    data: result,
  });
});

export const chatController = {
  createConversation,
  getConversations,
  getConversationMessages,
  markConversationAsRead,
};
