import { Router } from "express";
import authVerify from "../../middlewares/authVerify";
import validate from "../../middlewares/validate";
import { chatController } from "./chat.controller";
import { createConversationValidationSchema } from "./chat.validation";

const chatRouters = Router();

chatRouters.post(
  "/conversations",
  authVerify(["user", "vendor", "rider"]),
  validate(createConversationValidationSchema),
  chatController.createConversation,
);

chatRouters.get(
  "/conversations",
  authVerify(["user", "vendor", "rider"]),
  chatController.getConversations,
);

chatRouters.get(
  "/conversations/:id/messages",
  authVerify(["user", "vendor", "rider"]),
  chatController.getConversationMessages,
);

chatRouters.patch(
  "/conversations/:id/read",
  authVerify(["user", "vendor", "rider"]),
  chatController.markConversationAsRead,
);

export default chatRouters;
