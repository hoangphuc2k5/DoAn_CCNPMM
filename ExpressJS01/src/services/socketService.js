const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let ioInstance = null;
const onlineUsers = new Map(); // userId (string) -> Set of socketId (string)

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Allow all origins for development
      methods: ["GET", "POST"],
    },
  });

  ioInstance = io;

  // Socket.io JWT Authentication Middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization?.split(" ")?.[1];

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        _id: decoded._id,
        email: decoded.email,
        name: decoded.name,
      };
      next();
    } catch (err) {
      console.error("Socket authentication failed:", err.message);
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected to socket: ${socket.user.name} (${userId})`);

    // Join user's private room for direct notifications
    socket.join(userId);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Broadcast updated online users list
    io.emit("get_online_users", Array.from(onlineUsers.keys()));

    // Join conversation room
    socket.on("join_room", (conversationId) => {
      if (conversationId) {
        socket.join(conversationId.toString());
        console.log(`User ${socket.user.name} joined room ${conversationId}`);
      }
    });

    // Leave conversation room
    socket.on("leave_room", (conversationId) => {
      if (conversationId) {
        socket.leave(conversationId.toString());
        console.log(`User ${socket.user.name} left room ${conversationId}`);
      }
    });

    // Typing indicators
    socket.on("typing", ({ conversationId }) => {
      if (conversationId) {
        socket.to(conversationId.toString()).emit("typing", {
          conversationId,
          userId: socket.user._id,
          userName: socket.user.name,
        });
      }
    });

    socket.on("stop_typing", ({ conversationId }) => {
      if (conversationId) {
        socket.to(conversationId.toString()).emit("stop_typing", {
          conversationId,
          userId: socket.user._id,
        });
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected from socket: ${socket.user.name}`);
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
      // Broadcast updated online users list
      io.emit("get_online_users", Array.from(onlineUsers.keys()));
    });
  });

  return io;
};

const getIO = () => ioInstance;

const emitNewMessage = (conversationId, message) => {
  if (!ioInstance) return;

  const convIdStr = conversationId.toString();
  // Send message to everyone inside the conversation room
  ioInstance.to(convIdStr).emit("receive_message", message);

  // Send conversation update to all participants in their private rooms
  // so their sidebar lists update in real-time even if they are not in the chat room
  const participants = message.conversation?.participants || [];
  participants.forEach((participant) => {
    const pId = participant._id ? participant._id.toString() : participant.toString();
    ioInstance.to(pId).emit("conversation_updated", {
      conversationId: convIdStr,
      lastMessage: message,
    });
  });
};

const emitRecallMessage = (conversationId, message) => {
  if (!ioInstance) return;
  ioInstance.to(conversationId.toString()).emit("message_recalled", message);
};

const emitSeenMessage = (conversationId, userId, seenAt) => {
  if (!ioInstance) return;
  ioInstance.to(conversationId.toString()).emit("message_seen", {
    conversationId: conversationId.toString(),
    userId: userId.toString(),
    seenAt,
  });
};

const emitNotification = (userId, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(userId.toString()).emit("notification:new", payload);
};

module.exports = {
  initSocket,
  getIO,
  emitNewMessage,
  emitRecallMessage,
  emitSeenMessage,
  emitNotification,
};
