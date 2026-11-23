import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { registerChatSocket } from "./chat.socket";

export const initSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    // Open to all origins (reflects request origin; valid with credentials).
    cors: {
      origin: true,
      credentials: true,
    },
  });

  registerChatSocket(io);

  return io;
};
