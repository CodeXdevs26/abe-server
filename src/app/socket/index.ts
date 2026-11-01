import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { registerChatSocket } from "./chat.socket";

export const initSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:3000"],
      credentials: true,
    },
  });

  registerChatSocket(io);

  return io;
};
