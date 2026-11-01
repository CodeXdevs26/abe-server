import { Server, Socket } from "socket.io";
import AuthModel from "../modules/auth/auth.model";
import { chatServices } from "../modules/chat/chat.service";
import verifyJWT from "../utils/verifyJWT";

const getBearerToken = (token: string) =>
  token.startsWith("Bearer ") ? token.split("Bearer ")[1] : token;

const getConversationRoom = (conversationId: string) =>
  `conversation:${conversationId}`;

const attachChatHandlers = (io: Server, socket: Socket) => {
  socket.on("chat:join-room", async (payload: { conversationId: string }) => {
    try {
      const conversation = await chatServices.getConversationForParticipant(
        payload.conversationId,
        socket.data.user.email,
        socket.data.user.role,
      );

      const room = getConversationRoom(conversation._id.toString());
      await socket.join(room);
      socket.emit("chat:joined-room", {
        conversationId: conversation._id,
        room,
      });
    } catch (error: any) {
      socket.emit("chat:error", {
        message: error.message || "Failed to join room",
      });
    }
  });

  socket.on("chat:leave-room", async (payload: { conversationId: string }) => {
    const room = getConversationRoom(payload.conversationId);
    await socket.leave(room);
    socket.emit("chat:left-room", {
      conversationId: payload.conversationId,
      room,
    });
  });

  socket.on(
    "chat:send-message",
    async (payload: { conversationId: string; text: string }) => {
      try {
        const result = await chatServices.createMessage(
          payload.conversationId,
          socket.data.user.email,
          socket.data.user.role,
          payload.text,
        );

        const room = getConversationRoom(payload.conversationId);

        io.to(room).emit("chat:new-message", {
          conversationId: payload.conversationId,
          message: result.message,
        });

        io.to(room).emit("chat:conversation-updated", {
          conversationId: payload.conversationId,
          last_message: result.conversation?.last_message,
          last_message_at: result.conversation?.last_message_at,
          last_message_sender_role:
            result.conversation?.last_message_sender_role,
          customer_unread_count: result.conversation?.customer_unread_count,
          vendor_unread_count: result.conversation?.vendor_unread_count,
          participant_one_unread_count:
            result.conversation?.participant_one_unread_count,
          participant_two_unread_count:
            result.conversation?.participant_two_unread_count,
        });
      } catch (error: any) {
        socket.emit("chat:error", {
          message: error.message || "Failed to send message",
        });
      }
    },
  );

  socket.on(
    "chat:mark-as-read",
    async (payload: { conversationId: string }) => {
      try {
        const conversation = await chatServices.markConversationAsRead(
          payload.conversationId,
          socket.data.user.email,
          socket.data.user.role,
        );

        const room = getConversationRoom(payload.conversationId);

        io.to(room).emit("chat:messages-read", {
          conversationId: payload.conversationId,
          readBy: socket.data.user.email,
          unread_count: conversation.unread_count,
        });

        io.to(room).emit("chat:conversation-updated", {
          conversationId: payload.conversationId,
          unread_count: conversation.unread_count,
        });
      } catch (error: any) {
        socket.emit("chat:error", {
          message: error.message || "Failed to mark messages as read",
        });
      }
    },
  );
};

export const registerChatSocket = (io: Server) => {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.authorization ||
        socket.handshake.headers.authorization;

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = verifyJWT(getBearerToken(token));
      const authUser = await AuthModel.findOne({
        email: decoded.email,
        is_deleted: false,
        is_blocked: false,
      });

      if (!authUser || !["user", "vendor", "rider"].includes(authUser.role)) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = {
        email: decoded.email,
        role: decoded.role,
        id: decoded.id,
      };

      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.emit("chat:connected", {
      socketId: socket.id,
      user: socket.data.user,
    });

    attachChatHandlers(io, socket);
  });
};
